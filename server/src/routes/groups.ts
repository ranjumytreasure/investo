import { Express } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { Op } from 'sequelize';
// IMPORTANT: Import models/index FIRST to ensure associations are loaded
import '../models/index';
import { Group } from '../models/Group';
import { GroupUserShare } from '../models/GroupUserShare';
import { Receivable } from '../models/Finance';
import { GroupFeature } from '../models/GroupFeature';
import { FeatureConfig } from '../models/FeatureConfig';
import { User } from '../models/User';
import { calculateBillingCharges, calculateFeatureCharge } from '../lib/calculateCharges';
import { authenticateToken, AuthRequest } from '../middleware/auth';
// import { sendInvite, sendOTP } from '../lib/twilio'; // Parked for now

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export function registerGroupRoutes(app: Express, io: SocketIOServer) {
    // Get all groups with optional status filter
    // If user is authenticated, show groups created by them AND groups they are part of
    app.get('/groups', async (req, res) => {
        try {
            const { status } = req.query as { status?: string };

            const statusFilter: any = {};
            if (status && (status === 'new' || status === 'inprogress' || status === 'closed')) {
                statusFilter.status = status;
            }

            // Check if user is authenticated
            let userId: string | null = null;
            try {
                const authHeader = req.headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];
                if (token) {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { sub: string };
                    userId = decoded.sub;
                }
            } catch (e) {
                // Token not available or invalid - user not authenticated
            }

            if (userId) {
                // Get groups created by user
                const createdGroups = await Group.findAll({
                    where: {
                        ...statusFilter,
                        created_by: userId
                    },
                    attributes: ['id', 'name', 'amount', 'status', 'type', 'first_auction_date', 'auction_frequency', 'number_of_members', 'billing_charges', 'created_by', 'created_at'],
                    order: [['created_at', 'DESC']]
                });

                // Get groups user is part of (via GroupUserShare) - only get group IDs first
                const userShares = await GroupUserShare.findAll({
                    where: { user_id: userId },
                    attributes: ['group_id'],
                    group: ['group_id']
                });

                const joinedGroupIds = userShares.map(s => s.group_id).filter(Boolean);

                let joinedGroups: any[] = [];
                if (joinedGroupIds.length > 0) {
                    // Get groups user is part of
                    joinedGroups = await Group.findAll({
                        where: {
                            ...statusFilter,
                            id: { [Op.in]: joinedGroupIds },
                            created_by: { [Op.ne]: userId } // Exclude groups already in createdGroups
                        },
                        attributes: ['id', 'name', 'amount', 'status', 'type', 'first_auction_date', 'auction_frequency', 'number_of_members', 'billing_charges', 'created_by', 'created_at'],
                        order: [['created_at', 'DESC']]
                    });
                }

                // Combine and deduplicate groups
                const createdGroupIds = new Set(createdGroups.map(g => g.id));
                const allGroups = [
                    ...createdGroups,
                    ...joinedGroups.filter(g => !createdGroupIds.has(g.id))
                ].sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );

                // Add member statistics for each group
                const groupsWithStats = await Promise.all(
                    allGroups.map(async (group) => {
                        const groupJson = group.toJSON ? group.toJSON() : group;
                        const totalMembers = groupJson.number_of_members || 0;
                        
                        // Count added members (accepted or active shares)
                        const addedMembers = await GroupUserShare.count({
                            where: {
                                group_id: groupJson.id,
                                status: { [Op.in]: ['accepted', 'active'] }
                            }
                        });
                        
                        // Calculate pending members
                        const pendingMembers = totalMembers - addedMembers;
                        
                        return {
                            ...groupJson,
                            added_members: addedMembers,
                            pending_members: pendingMembers > 0 ? pendingMembers : 0
                        };
                    })
                );

                return res.json(groupsWithStats);
            } else {
                // Not authenticated - show all groups (or none, depending on requirement)
                const groups = await Group.findAll({
                    where: statusFilter,
                    attributes: ['id', 'name', 'amount', 'status', 'type', 'first_auction_date', 'auction_frequency', 'number_of_members', 'billing_charges', 'created_by', 'created_at'],
                    order: [['created_at', 'DESC']]
                });

                // Add member statistics for each group
                const groupsWithStats = await Promise.all(
                    groups.map(async (group) => {
                        const groupJson = group.toJSON ? group.toJSON() : group;
                        const totalMembers = groupJson.number_of_members || 0;
                        
                        // Count added members (accepted or active shares)
                        const addedMembers = await GroupUserShare.count({
                            where: {
                                group_id: groupJson.id,
                                status: { [Op.in]: ['accepted', 'active'] }
                            }
                        });
                        
                        // Calculate pending members
                        const pendingMembers = totalMembers - addedMembers;
                        
                        return {
                            ...groupJson,
                            added_members: addedMembers,
                            pending_members: pendingMembers > 0 ? pendingMembers : 0
                        };
                    })
                );

                return res.json(groupsWithStats);
            }
        } catch (error: any) {
            console.error('Error fetching groups:', error);
            return res.status(400).json({
                message: error.message || 'Failed to fetch groups'
            });
        }
    });

    app.post('/groups', async (req, res) => {
        try {
            const {
                name,
                amount,
                type,
                first_auction_date,
                auction_frequency,
                number_of_members,
                auction_start_at,
                auction_end_at,
                features, // Array of feature IDs
                created_by
            } = req.body as {
                name: string;
                amount: number;
                type?: string;
                first_auction_date?: string;
                auction_frequency?: string;
                number_of_members?: number;
                auction_start_at?: string;
                auction_end_at?: string;
                features?: string[];
                created_by?: string;
                creator_share_percent?: number; // Creator's share percentage
            };

            // Validation
            if (!name || !amount) {
                return res.status(400).json({
                    message: 'Name and amount are required'
                });
            }

            if (typeof amount !== 'number' || amount <= 0) {
                return res.status(400).json({
                    message: 'Amount must be a positive number'
                });
            }

            const groupAmount = parseFloat(amount.toString());

            // Fetch selected features from FeatureConfig
            let selectedFeatures: FeatureConfig[] = [];
            let billingCharges = 0;

            if (features && features.length > 0) {
                selectedFeatures = await FeatureConfig.findAll({
                    where: {
                        id: features,
                        is_active: true
                    }
                });

                // Calculate billing charges
                const featureCharges = selectedFeatures.map(f => ({ charge_percent: f.charge_percent }));
                billingCharges = calculateBillingCharges(groupAmount, featureCharges);
            }

            // Get current user from token if available
            let currentUserId: string | null = null;
            try {
                const authHeader = req.headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];
                if (token) {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { sub: string };
                    currentUserId = decoded.sub;
                    console.log(`✅ Extracted user ID from token: ${currentUserId}`);
                }
            } catch (e) {
                console.warn('⚠️ Could not extract user from token:', e);
                // Token not available or invalid
            }

            // Determine created_by: prioritize authenticated user from token, then fallback to body parameter
            let finalCreatedBy: string | null = null;
            if (currentUserId) {
                finalCreatedBy = currentUserId; // Always use authenticated user if available
            } else if (created_by && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(created_by)) {
                finalCreatedBy = created_by; // Use body parameter only if valid UUID and no token
            }

            const groupData: any = {
                name: name.trim(),
                amount: groupAmount,
                type: type || 'deductive',
                status: 'new', // New groups start with 'new' status
                billing_charges: billingCharges,
                number_of_members: number_of_members || null,
                auction_frequency: auction_frequency || null,
                created_by: finalCreatedBy // Set created_by from authenticated user or valid body parameter
            };

            console.log(`📝 Creating group with created_by: ${finalCreatedBy || 'null'}`);

            // Handle first_auction_date
            if (first_auction_date) {
                const firstDate = new Date(first_auction_date);
                if (!isNaN(firstDate.getTime())) {
                    groupData.first_auction_date = firstDate;
                }
            }

            // Only add auction dates if provided
            if (auction_start_at) {
                const startDate = new Date(auction_start_at);
                if (!isNaN(startDate.getTime())) {
                    groupData.auction_start_at = startDate;
                }
            }

            if (auction_end_at) {
                const endDate = new Date(auction_end_at);
                if (!isNaN(endDate.getTime())) {
                    groupData.auction_end_at = endDate;
                }
            }

            const group = await Group.create(groupData);
            console.log(`✅ Group created: ${group.id} by user ${group.created_by || 'unknown'}`);

            // Save selected features to group_features table
            let savedFeatures: any[] = [];
            if (selectedFeatures.length > 0) {
                const featureRecords = selectedFeatures.map(feature => ({
                    group_id: group.id,
                    feature_id: feature.id,
                    feature_name: feature.name,
                    charge_percent: feature.charge_percent,
                    charge_amount: calculateFeatureCharge(groupAmount, feature.charge_percent),
                    enabled: true
                }));

                const createdFeatures = await GroupFeature.bulkCreate(featureRecords);
                savedFeatures = createdFeatures.map(f => ({
                    id: f.id,
                    group_id: f.group_id,
                    feature_id: f.feature_id,
                    feature_name: f.feature_name,
                    charge_percent: f.charge_percent,
                    charge_amount: f.charge_amount,
                    enabled: f.enabled
                }));
                console.log(`✅ Saved ${featureRecords.length} features for group ${group.id}`);
            } else {
                console.log(`ℹ️ No features selected for group ${group.id}`);
            }

            // Automatically create a share for the creator if user is authenticated and group has members
            if (currentUserId && group.number_of_members) {
                try {
                    // Get creator's share percentage from request (default to 100%)
                    const creatorSharePercent = req.body.creator_share_percent || 100;

                    if (creatorSharePercent < 0.01 || creatorSharePercent > 100) {
                        console.warn(`Invalid creator_share_percent: ${creatorSharePercent}, defaulting to 100%`);
                    }

                    const validSharePercent = Math.max(0.01, Math.min(100, creatorSharePercent));

                    // Calculate share details - contribution_amount = (group_amount * share_percent) / 100
                    // 100% share = full group amount, 50% = half, 30% = 30% of group amount
                    const shareAmount = (groupAmount * validSharePercent) / 100;

                    const creatorShare = await GroupUserShare.create({
                        group_id: group.id,
                        user_id: currentUserId,
                        phone: null, // Creator is already a registered user
                        share_no: 1, // First share
                        share_percent: validSharePercent, // Creator's specified share percentage
                        contribution_amount: shareAmount,
                        status: 'active', // Creator's share is active
                        invited_by: null,
                        can_invite: true // Creator can invite others
                    });
                    console.log(`✅ Created share #1 for group creator ${currentUserId} with ${validSharePercent}%`);
                } catch (shareError: any) {
                    console.error('Error creating creator share:', shareError);
                    // Don't fail group creation if share creation fails
                }
            }

            // Return group with saved features
            return res.json({
                ...group.toJSON(),
                features: savedFeatures
            });
        } catch (error: any) {
            console.error('Error creating group:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));

            // Extract more detailed error information
            let errorMessage = 'Failed to create group';
            if (error.errors && Array.isArray(error.errors)) {
                errorMessage = error.errors.map((e: any) => e.message).join(', ');
            } else if (error.message) {
                errorMessage = error.message;
            }

            return res.status(400).json({
                message: errorMessage,
                error: error.errors || error.message || 'Unknown error'
            });
        }
    });

    app.post('/groups/:id/add-member', async (req, res) => {
        const { id } = req.params;
        const { user_id, share_no, share_percent, contribution_amount } = req.body as any;
        const gus = await GroupUserShare.create({ group_id: id, user_id, share_no, share_percent, contribution_amount });
        io.to(id).emit('group:member_added', { group_id: id, user_id });
        return res.json(gus);
    });

    app.get('/groups/:id/receivables-summary', async (req, res) => {
        const { id } = req.params;
        const pendingCount = await Receivable.count({ where: { group_id: id, status: 'pending' } });
        const paidCount = await Receivable.count({ where: { group_id: id, status: 'paid' } });
        return res.json({ pendingCount, paidCount });
    });

    // Get all features for a specific group
    app.get('/groups/:id/features', async (req, res) => {
        try {
            const { id } = req.params;
            const group = await Group.findByPk(id);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }
            const features = await GroupFeature.findAll({
                where: { group_id: id, enabled: true }
            });
            return res.json({
                group: group,
                features: features
            });
        } catch (error: any) {
            console.error('Error fetching group features:', error);
            return res.status(400).json({
                message: error.message || 'Failed to fetch group features'
            });
        }
    });

    // Add/update features for a group
    app.post('/groups/:id/features', async (req, res) => {
        try {
            const { id } = req.params;
            const { feature_ids } = req.body as { feature_ids: string[] };

            const group = await Group.findByPk(id);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            // Fetch features from FeatureConfig
            const selectedFeatures = await FeatureConfig.findAll({
                where: {
                    id: feature_ids,
                    is_active: true
                }
            });

            // Remove existing features for this group
            await GroupFeature.destroy({ where: { group_id: id } });

            // Add new features
            if (selectedFeatures.length > 0) {
                const groupAmount = parseFloat(group.amount.toString());
                const featureRecords = selectedFeatures.map(feature => ({
                    group_id: id,
                    feature_id: feature.id,
                    feature_name: feature.name,
                    charge_percent: feature.charge_percent,
                    charge_amount: calculateFeatureCharge(groupAmount, feature.charge_percent),
                    enabled: true
                }));

                await GroupFeature.bulkCreate(featureRecords);
                console.log(`✅ Updated ${featureRecords.length} features for group ${id}`);

                // Recalculate billing charges
                const featureCharges = selectedFeatures.map(f => ({ charge_percent: f.charge_percent }));
                const newBillingCharges = calculateBillingCharges(groupAmount, featureCharges);

                await group.update({ billing_charges: newBillingCharges });
            } else {
                await group.update({ billing_charges: 0 });
                console.log(`✅ Removed all features for group ${id}`);
            }

            const updatedFeatures = await GroupFeature.findAll({
                where: { group_id: id, enabled: true }
            });

            return res.json({
                group: group,
                features: updatedFeatures,
                billing_charges: group.billing_charges
            });
        } catch (error: any) {
            console.error('Error updating group features:', error);
            return res.status(400).json({
                message: error.message || 'Failed to update group features'
            });
        }
    });

    // Get single group with details, shares, and features
    app.get('/groups/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const group = await Group.findByPk(id);

            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            // Get current user from token if available
            let currentUserId: string | null = null;
            try {
                const authHeader = req.headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];
                if (token) {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { sub: string };
                    currentUserId = decoded.sub;
                }
            } catch (e) {
                // Token not available or invalid
            }

            // Auto-create creator share if missing
            // Always ensure creator has a share if they're viewing their own group
            if (currentUserId && group.number_of_members) {
                // Check if user is the creator (or created_by is null for old groups)
                const isCreator = group.created_by === currentUserId || group.created_by === null;

                if (isCreator) {
                    const existingCreatorShare = await GroupUserShare.findOne({
                        where: {
                            group_id: id,
                            user_id: currentUserId,
                            status: { [Op.in]: ['pending', 'accepted', 'active'] }
                        }
                    });

                    if (!existingCreatorShare) {
                        // Creator doesn't have a share yet - create one automatically with 100%
                        const groupAmount = parseFloat(group.amount.toString());
                        // Calculate contribution amount - contribution_amount = (group_amount * share_percent) / 100
                        // 100% share = full group amount, 50% = half, 30% = 30% of group amount
                        const shareAmount = (groupAmount * 100) / 100; // 100% = full amount

                        try {
                            await GroupUserShare.create({
                                group_id: id,
                                user_id: currentUserId,
                                phone: null, // Creator is already a registered user
                                share_no: 1,
                                share_percent: 100, // Default to 100% for existing groups
                                contribution_amount: shareAmount,
                                status: 'active',
                                invited_by: null,
                                can_invite: true
                            });
                            console.log(`✅ Auto-created share #1 for group creator ${currentUserId} in group ${id}`);

                            // Update created_by if it was null (for old groups)
                            if (group.created_by === null) {
                                await group.update({ created_by: currentUserId });
                                console.log(`✅ Updated created_by for group ${id} to ${currentUserId}`);
                            }
                        } catch (shareError: any) {
                            console.error('Error auto-creating creator share:', shareError);
                            console.error('Share error details:', shareError.message);
                            // Continue anyway - don't fail the request
                        }
                    } else {
                        console.log(`ℹ️ Creator ${currentUserId} already has a share in group ${id}`);
                    }
                }
            }

            // No authorization check - allow viewing if group exists
            // Creator can always view their group, and the auto-share creation above handles missing shares

            // Get all shares - handle includes more gracefully
            let shares: any[] = [];
            try {
                // Use the association defined in models/index.ts
                // GroupUserShare.belongsTo(User, { foreignKey: 'user_id', required: false })
                shares = await GroupUserShare.findAll({
                    where: { group_id: id },
                    include: [{
                        model: User,
                        attributes: ['id', 'name', 'phone', 'referred_by', 'face_scan_url'],
                        required: false // Left join - allow shares without users (pending invites)
                        // No explicit alias - Sequelize will use the model name automatically
                    }],
                    order: [['created_at', 'ASC']]
                });
                console.log(`✅ Found ${shares.length} shares for group ${id}`);
                // Debug: log first share structure
                if (shares.length > 0) {
                    const firstShare = shares[0];
                    const firstShareUser = (firstShare as any).User || (firstShare as any).user;
                    console.log(`📝 First share structure:`, {
                        id: firstShare.id,
                        user_id: (firstShare as any).user_id,
                        phone: (firstShare as any).phone,
                        user_name: firstShareUser?.name || 'NO NAME',
                        user_phone: firstShareUser?.phone || 'NO PHONE',
                        hasUserModel: !!firstShareUser
                    });
                }
            } catch (shareQueryError: any) {
                console.error('❌ Error fetching shares with include:', shareQueryError);
                console.error('Error details:', shareQueryError.message);
                console.error('Stack:', shareQueryError.stack);

                // If association error, fetch shares and users separately, then manually join
                if (shareQueryError.message?.includes('not associated') || shareQueryError.message?.includes('User is not associated')) {
                    console.log('⚠️ Association error. Fetching shares and users separately for manual JOIN (group_usershares.user_id = users.id)...');
                    try {
                        // Fetch shares without include
                        shares = await GroupUserShare.findAll({
                            where: { group_id: id },
                            order: [['created_at', 'ASC']]
                        });
                        console.log(`✅ Found ${shares.length} shares (without User include) for group ${id}`);

                        // Fetch all unique user_ids from shares and JOIN manually
                        const userIds = shares
                            .map(s => s.user_id)
                            .filter((id): id is string => id !== null && id !== undefined);

                        if (userIds.length > 0) {
                            // Manual JOIN: Fetch users where users.id IN (user_ids from shares)
                            const users = await User.findAll({
                                where: { id: { [Op.in]: userIds } },
                                attributes: ['id', 'name', 'phone', 'referred_by', 'face_scan_url']
                            });

                            // Create a map for quick lookup: users.id -> User object
                            const usersMap = new Map(users.map(u => [u.id, u]));
                            console.log(`✅ Fetched ${users.length} users for manual JOIN (group_usershares.user_id = users.id)`);

                            // Manually attach users to shares (simulate the JOIN)
                            shares = shares.map((share: any) => {
                                if (share.user_id && usersMap.has(share.user_id)) {
                                    // Attach User to share instance
                                    share.User = usersMap.get(share.user_id);
                                    const userName = usersMap.get(share.user_id)?.name;
                                    console.log(`✅ Attached user ${share.user_id} (name: "${userName || 'NO NAME'}") to share ${share.id}`);
                                }
                                return share;
                            });
                        } else {
                            console.log('ℹ️ No user_ids found in shares, skipping user fetch');
                        }
                    } catch (fallbackError: any) {
                        console.error('❌ Manual JOIN also failed:', fallbackError);
                        shares = []; // Continue with empty shares array
                    }
                } else {
                    // For other errors, try simple fetch
                    try {
                        shares = await GroupUserShare.findAll({
                            where: { group_id: id },
                            order: [['created_at', 'ASC']]
                        });
                        console.log(`✅ Found ${shares.length} shares (without User include) for group ${id}`);
                    } catch (fallbackError: any) {
                        console.error('❌ Fallback query also failed:', fallbackError);
                        shares = []; // Continue with empty shares array
                    }
                }
            }

            // Get features
            const features = await GroupFeature.findAll({
                where: { group_id: id, enabled: true }
            });

            // Calculate available shares
            // Group shares by share_no to see which shares are complete/incomplete
            const totalShareCount = group.number_of_members || 0;
            const sharesByNumber = new Map<number, any[]>();

            shares.forEach(share => {
                const shareNo = share.share_no;
                if (!sharesByNumber.has(shareNo)) {
                    sharesByNumber.set(shareNo, []);
                }
                sharesByNumber.get(shareNo)!.push(share);
            });

            // Calculate available share slots (share numbers not yet started or incomplete)
            const availableShareNumbers: number[] = [];
            for (let i = 1; i <= totalShareCount; i++) {
                const shareGroup = sharesByNumber.get(i) || [];
                const totalPercent = shareGroup.reduce((sum, s) => sum + parseFloat(s.share_percent.toString()), 0);
                if (shareGroup.length === 0) {
                    // Share number not started - 100% available
                    availableShareNumbers.push(i);
                } else if (totalPercent < 100) {
                    // Share number started but incomplete - partial available
                    availableShareNumbers.push(i);
                }
            }

            // Calculate statistics
            const completedShares = Array.from(sharesByNumber.values()).filter(group => {
                const total = group.reduce((sum, s) => sum + parseFloat(s.share_percent.toString()), 0);
                return total >= 100;
            }).length;

            // Calculate stats: total users, who invited whom, referral chain
            const totalUsers = new Set(shares.map(s => s.user_id).filter(Boolean)).size;
            const pendingInvites = shares.filter(s => s.status === 'pending').length;
            const acceptedShares = shares.filter(s => s.status === 'accepted' || s.status === 'active').length;

            // Get inviter details for each share (if any invited_by values exist)
            const invitedByIds = shares.map(s => s.invited_by).filter(Boolean) as string[];
            const invitersMap = new Map<string, any>();

            if (invitedByIds.length > 0) {
                try {
                    const inviters = await User.findAll({
                        where: {
                            id: { [Op.in]: invitedByIds }
                        },
                        attributes: ['id', 'name', 'phone']
                    });
                    inviters.forEach(u => invitersMap.set(u.id, u));
                } catch (inviterError: any) {
                    console.error('Error fetching inviters:', inviterError);
                    // Continue without inviter details
                }
            }

            // Map shares with user and inviter information safely
            // First, collect all pending invite phone numbers to fetch in batch
            const pendingPhones = shares
                .map(s => {
                    const shareJson = s.toJSON ? s.toJSON() : s;
                    return shareJson.user_id ? null : shareJson.phone;
                })
                .filter((phone): phone is string => phone !== null && phone !== undefined);

            // Fetch all pending users in one query
            const pendingUsers = pendingPhones.length > 0
                ? await User.findAll({ where: { phone: { [Op.in]: pendingPhones } } })
                : [];
            const pendingUsersMap = new Map(pendingUsers.map(u => [u.phone, u]));

            // Map shares with user and inviter information
            // group_usershares.user_id -> users.id JOIN to get users.name
            const mappedShares = shares.map(s => {
                // Convert to plain object first to see the structure
                const shareJson = s.toJSON ? s.toJSON() : s;

                // Access the included User model BEFORE toJSON() to preserve the association
                // The join: group_usershares.user_id references users.id
                let includedUser: any = null;
                if ((s as any).User) {
                    // Sequelize attaches included models with the model name 'User'
                    includedUser = (s as any).User;
                } else if ((s as any).dataValues && (s as any).dataValues.User) {
                    includedUser = (s as any).dataValues.User;
                }

                // For shares with user_id, JOIN with users table to get name
                // group_usershares.user_id = users.id
                let userData = null;
                if (shareJson.user_id) {
                    if (includedUser) {
                        // includedUser is a Sequelize Model instance from the JOIN
                        // Extract name from users table via the JOIN
                        const userName = includedUser.get ? includedUser.get('name') : (includedUser.name || includedUser.dataValues?.name);
                        const userPhone = includedUser.get ? includedUser.get('phone') : (includedUser.phone || includedUser.dataValues?.phone);
                        const userFaceScan = includedUser.get ? includedUser.get('face_scan_url') : (includedUser.face_scan_url || includedUser.dataValues?.face_scan_url);
                        const userReferredBy = includedUser.get ? includedUser.get('referred_by') : (includedUser.referred_by || includedUser.dataValues?.referred_by);

                        userData = {
                            id: shareJson.user_id, // From group_usershares.user_id
                            name: userName || null, // From users.name via JOIN (group_usershares.user_id = users.id)
                            phone: userPhone || shareJson.phone || null, // From users.phone
                            referred_by: userReferredBy || null,
                            avatarUrl: null,
                            face_scan_url: userFaceScan || null
                        };
                    } else {
                        // If User wasn't included in the query, fetch it directly
                        // This is a fallback (shouldn't happen if join is working)
                        console.warn(`⚠️ User not included for share ${shareJson.id}, user_id: ${shareJson.user_id}`);
                    }
                } else if (shareJson.phone && !shareJson.user_id) {
                    // For pending invites (no user_id), get the user from the batch-fetched map
                    const pendingUser = pendingUsersMap.get(shareJson.phone);
                    if (pendingUser) {
                        userData = {
                            id: pendingUser.id,
                            name: pendingUser.name || null, // From users.name
                            phone: pendingUser.phone || shareJson.phone || null,
                            referred_by: pendingUser.referred_by || null,
                            avatarUrl: null,
                            face_scan_url: pendingUser.face_scan_url || null
                        };
                    }
                }

                const inviterData = shareJson.invited_by ? {
                    id: invitersMap.get(shareJson.invited_by)?.id || shareJson.invited_by,
                    name: invitersMap.get(shareJson.invited_by)?.name || null,
                    phone: invitersMap.get(shareJson.invited_by)?.phone || null
                } : null;

                // Debug log for user data to verify JOIN is working
                // JOIN: group_usershares.user_id -> users.id to get users.name
                if (shareJson.user_id) {
                    if (!includedUser) {
                        console.warn(`⚠️ Share ${shareJson.id}: user_id ${shareJson.user_id} exists but User JOIN failed - User model not included`);
                    } else {
                        const userName = includedUser.get ? includedUser.get('name') : (includedUser.name || includedUser.dataValues?.name);
                        const userPhone = includedUser.get ? includedUser.get('phone') : (includedUser.phone || includedUser.dataValues?.phone);

                        if (!userName) {
                            console.warn(`⚠️ Share ${shareJson.id}: JOIN successful (user_id ${shareJson.user_id} = users.id) but users.name is NULL. Phone: ${userPhone}`);
                        } else {
                            console.log(`✅ Share ${shareJson.id}: JOIN successful! user_id ${shareJson.user_id} -> users.id -> name: "${userName}", phone: "${userPhone}"`);
                        }
                    }
                }

                return {
                    ...shareJson,
                    invite_link: shareJson.invite_link || null, // Include invite_link for resending
                    user: userData,
                    inviter: inviterData,
                    can_invite: shareJson.can_invite || false
                };
            });

            // Debug: Log first mapped share to verify user data
            if (mappedShares.length > 0) {
                const firstMapped = mappedShares[0];
                console.log(`📋 First mapped share user data:`, {
                    share_id: firstMapped.id,
                    has_user: !!firstMapped.user,
                    user_name: firstMapped.user?.name || 'NO NAME',
                    user_phone: firstMapped.user?.phone || 'NO PHONE',
                    share_phone: firstMapped.phone || 'NO PHONE'
                });
            }

            console.log(`📊 Returning group ${id} with ${mappedShares.length} shares`);

            return res.json({
                group: group.toJSON(),
                shares: mappedShares,
                features: features,
                availableShareNumbers: availableShareNumbers,
                completedShares: completedShares,
                totalShares: totalShareCount,
                stats: {
                    totalUsers: totalUsers,
                    totalSharesAllocated: shares.length,
                    completedShares: completedShares,
                    pendingInvites: pendingInvites,
                    acceptedShares: acceptedShares
                }
            });
        } catch (error: any) {
            console.error('Error fetching group details:', error);
            return res.status(400).json({
                message: error.message || 'Failed to fetch group details'
            });
        }
    });

    // Public group view (no auth required) - for invite links
    app.get('/groups/:id/public', async (req, res) => {
        try {
            const { id } = req.params;

            const group = await Group.findByPk(id);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            // Get basic group info, shares, and features (public view)
            let shares: any[] = [];
            try {
                shares = await GroupUserShare.findAll({
                    where: { group_id: id },
                    include: [{
                        model: User,
                        attributes: ['id', 'name', 'phone'],
                        required: false
                    }],
                    order: [['created_at', 'ASC']]
                });
            } catch (shareError: any) {
                console.error('Error fetching shares in public view:', shareError);
                // Fallback: fetch without User include
                shares = await GroupUserShare.findAll({
                    where: { group_id: id },
                    order: [['created_at', 'ASC']]
                });
            }

            // Get features with safe error handling
            let features: any[] = [];
            try {
                features = await GroupFeature.findAll({
                    where: { group_id: id, enabled: true },
                    include: [{
                        model: FeatureConfig,
                        attributes: ['name', 'description', 'charge_percent'],
                        required: false
                    }]
                });
            } catch (featureError: any) {
                console.error('Error fetching features with FeatureConfig:', featureError);
                // Fallback: fetch features without FeatureConfig include
                features = await GroupFeature.findAll({
                    where: { group_id: id, enabled: true }
                });
                // Fetch FeatureConfig separately if needed
                const featureIds = features.map(f => f.feature_id).filter(Boolean);
                if (featureIds.length > 0) {
                    const featureConfigs = await FeatureConfig.findAll({
                        where: { id: { [Op.in]: featureIds } },
                        attributes: ['id', 'name', 'description', 'charge_percent']
                    });
                    const configMap = new Map(featureConfigs.map(fc => [fc.id, fc]));
                    features = features.map(f => {
                        const config = configMap.get(f.feature_id);
                        return {
                            ...f.toJSON(),
                            FeatureConfig: config || null
                        };
                    });
                }
            }

            // Group shares by share_no
            const sharesByNumber = new Map<number, any[]>();
            shares.forEach(s => {
                const shareNo = s.share_no;
                if (!sharesByNumber.has(shareNo)) {
                    sharesByNumber.set(shareNo, []);
                }
                sharesByNumber.get(shareNo)!.push(s);
            });

            const totalShareCount = group.number_of_members || 0;
            const completedShares = Array.from(sharesByNumber.values()).filter(group => {
                const total = group.reduce((sum, s) => sum + parseFloat(s.share_percent.toString()), 0);
                return total >= 100;
            }).length;

            // Map shares safely (handle both with and without User include)
            const mappedShares = shares.map(s => {
                const shareJson = s.toJSON ? s.toJSON() : s;
                // Try to get user data from included User model
                const includedUser = (s as any).User || null;
                return {
                    ...shareJson,
                    invite_link: shareJson.invite_link || null, // Include invite_link if it exists
                    user: shareJson.user_id ? {
                        id: includedUser?.id || shareJson.user_id,
                        name: includedUser?.name || null,
                        phone: includedUser?.phone || shareJson.phone || null,
                        avatarUrl: (includedUser as any)?.avatar_url || null,
                        face_scan_url: includedUser?.face_scan_url || null
                    } : null
                };
            });

            return res.json({
                group: group.toJSON(),
                shares: mappedShares,
                features: features.map(f => ({
                    id: f.id,
                    name: (f as any).FeatureConfig?.name,
                    description: (f as any).FeatureConfig?.description,
                    charge_percent: (f as any).FeatureConfig?.charge_percent
                })),
                completedShares,
                totalShares: totalShareCount,
                isPublic: true
            });
        } catch (error: any) {
            console.error('Error fetching public group details:', error);
            return res.status(400).json({
                message: error.message || 'Failed to fetch group details'
            });
        }
    });

    // Request OTP for invite acceptance
    app.post('/groups/:id/invite/request-otp', async (req, res) => {
        try {
            const { id } = req.params;
            const { phone } = req.body as { phone: string };

            if (!phone) {
                return res.status(400).json({ message: 'Phone number is required' });
            }

            // Verify user exists and has a pending invite for this group
            const user = await User.findOne({ where: { phone } });
            if (!user) {
                return res.status(404).json({ message: 'No invite found for this phone number' });
            }

            const pendingShare = await GroupUserShare.findOne({
                where: {
                    group_id: id,
                    user_id: user.id,
                    status: 'pending'
                }
            });

            if (!pendingShare) {
                return res.status(404).json({ message: 'No pending invite found for this phone number in this group' });
            }

            // Generate OTP
            const otp = generateOtp();
            const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Update user's OTP (this is for invite acceptance, separate from regular auth OTP)
            user.otp = otp;
            user.otp_expires_at = expires as any;
            await user.save();

            // Send OTP via SMS/WhatsApp (Parked for now - Twilio disabled)
            // const sendMethod = (process.env.TWILIO_SEND_VIA as 'sms' | 'whatsapp' | 'both') || 'both';
            // const otpResult = await sendOTP(phone, otp, 'invite verification', sendMethod);

            // Log for development
            console.log('═══════════════════════════════════════════════════════');
            console.log(`📱 [DEV] INVITE OTP REQUEST`);
            console.log(`   Phone: ${phone}`);
            console.log(`   Group ID: ${id}`);
            console.log(`   OTP: ${otp}`);
            console.log(`   Expires: ${expires.toISOString()}`);
            // console.log(`   SMS SID: ${otpResult.smsSid || 'Not sent'}`);
            // console.log(`   WhatsApp SID: ${otpResult.whatsappSid || 'Not sent'}`);
            console.log('═══════════════════════════════════════════════════════');

            // Return OTP in response for development/testing
            return res.json({
                ok: true,
                otp: otp, // Always return OTP in development mode
                message: `OTP generated for ${phone}. Check console for OTP.`
            });
        } catch (error: any) {
            console.error('Error requesting invite OTP:', error);
            return res.status(400).json({
                message: error.message || 'Failed to request OTP'
            });
        }
    });

    // Delete a share
    app.delete('/groups/:id/shares/:shareId', authenticateToken, async (req, res) => {
        try {
            const { id, shareId } = req.params;
            const currentUserId = (req as AuthRequest).user?.id;

            if (!currentUserId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // Find the share
            const share = await GroupUserShare.findOne({
                where: {
                    id: shareId,
                    group_id: id
                },
                include: [{
                    model: Group,
                    attributes: ['id', 'status', 'created_by']
                }]
            });

            if (!share) {
                return res.status(404).json({ message: 'Share not found' });
            }

            const group = (share as any).Group as Group;
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            // Check permissions: Only creator can delete shares, or user can delete their own pending invites
            if (group.created_by !== currentUserId && share.invited_by !== currentUserId && share.status !== 'pending') {
                return res.status(403).json({ message: 'You do not have permission to delete this share' });
            }

            // Only allow deletion of shares in 'new' groups
            if (group.status !== 'new') {
                return res.status(400).json({ message: 'Can only delete shares from new groups' });
            }

            // Delete the share
            await share.destroy();

            console.log(`✅ Deleted share ${shareId} from group ${id}`);

            return res.json({
                message: 'Share deleted successfully'
            });
        } catch (error: any) {
            console.error('Error deleting share:', error);
            return res.status(400).json({
                message: error.message || 'Failed to delete share'
            });
        }
    });

    // Clone a share (duplicate for the same user)
    app.post('/groups/:id/shares/:shareId/clone', authenticateToken, async (req, res) => {
        try {
            const { id, shareId } = req.params;
            const currentUserId = (req as AuthRequest).user?.id;

            if (!currentUserId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // Find the share to clone
            const originalShare = await GroupUserShare.findOne({
                where: {
                    id: shareId,
                    group_id: id
                },
                include: [{
                    model: Group,
                    attributes: ['id', 'status', 'created_by', 'amount', 'number_of_members', 'billing_charges']
                }]
            });

            if (!originalShare) {
                return res.status(404).json({ message: 'Share not found' });
            }

            const group = (originalShare as any).Group as Group;
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            // Only allow cloning in 'new' groups
            if (group.status !== 'new') {
                return res.status(400).json({ message: 'Can only clone shares in new groups' });
            }

            // Only allow cloning accepted/active shares
            if (originalShare.status !== 'accepted' && originalShare.status !== 'active') {
                return res.status(400).json({ message: 'Can only clone accepted or active shares' });
            }

            // Check if user has permission (creator or the share owner)
            if (group.created_by !== currentUserId && originalShare.user_id !== currentUserId) {
                return res.status(403).json({ message: 'You do not have permission to clone this share' });
            }

            // Check available shares
            const allShares = await GroupUserShare.findAll({
                where: { group_id: id }
            });

            // Find the next available share number
            const existingShareNumbers = new Set(allShares.map(s => s.share_no));
            const totalShares = group.number_of_members || 1;
            let targetShareNo = originalShare.share_no;

            // Try to find an empty share first
            for (let i = 1; i <= totalShares; i++) {
                const sharesForNumber = allShares.filter(s => s.share_no === i);
                if (sharesForNumber.length === 0) {
                    targetShareNo = i;
                    break;
                }
            }

            // If no empty share, check if original share number has space
            const sharesForOriginalNumber = allShares.filter(s => s.share_no === originalShare.share_no);
            const allocatedPercent = sharesForOriginalNumber.reduce((sum, s) => sum + parseFloat(s.share_percent.toString()), 0);
            const availablePercent = 100 - allocatedPercent;

            const sharePercent = parseFloat(originalShare.share_percent.toString());
            if (availablePercent < sharePercent && targetShareNo === originalShare.share_no) {
                return res.status(400).json({
                    message: `Share #${originalShare.share_no} does not have enough space (${availablePercent.toFixed(2)}% available, need ${sharePercent.toFixed(2)}%)`
                });
            }

            // Calculate contribution amount - contribution_amount = (group_amount * share_percent) / 100
            // 100% share = full group amount, 50% = half, 30% = 30% of group amount
            const groupAmount = parseFloat(group.amount.toString());
            const contributionAmount = (groupAmount * sharePercent) / 100;

            // Create cloned share
            const clonedShare = await GroupUserShare.create({
                group_id: id,
                user_id: originalShare.user_id,
                phone: originalShare.phone,
                share_no: targetShareNo,
                share_percent: sharePercent,
                contribution_amount: contributionAmount,
                status: originalShare.status,
                invited_by: originalShare.invited_by,
                can_invite: originalShare.can_invite,
                invite_otp: null,
                invite_otp_expires_at: null,
                invite_link: null
            });

            console.log(`✅ Cloned share ${shareId} to share #${targetShareNo} for user ${originalShare.user_id || originalShare.phone}`);

            return res.json({
                message: 'Share cloned successfully',
                share: {
                    id: clonedShare.id,
                    share_no: clonedShare.share_no,
                    share_percent: clonedShare.share_percent,
                    contribution_amount: clonedShare.contribution_amount
                }
            });
        } catch (error: any) {
            console.error('Error cloning share:', error);
            return res.status(400).json({
                message: error.message || 'Failed to clone share'
            });
        }
    });

    // Verify OTP (first step - just verify OTP, don't activate yet)
    app.post('/groups/:id/invite/verify-otp', async (req, res) => {
        try {
            const { id } = req.params;
            const { phone, otp } = req.body as { phone: string; otp: string };

            if (!phone || !otp) {
                return res.status(400).json({ message: 'Phone and OTP are required' });
            }

            const user = await User.findOne({ where: { phone } });
            if (!user || !user.otp || !user.otp_expires_at) {
                return res.status(400).json({ message: 'Invalid OTP or OTP expired' });
            }

            const expiresAtMs = new Date(user.otp_expires_at as any).getTime();
            if (user.otp !== otp || expiresAtMs < Date.now()) {
                return res.status(400).json({ message: 'Invalid OTP or OTP expired' });
            }

            // Find the pending share
            const pendingShare = await GroupUserShare.findOne({
                where: {
                    group_id: id,
                    user_id: user.id,
                    status: 'pending'
                }
            });

            if (!pendingShare) {
                return res.status(404).json({ message: 'No pending invite found for this phone number' });
            }

            // OTP verified successfully - but don't activate yet
            // Return verification status, user must set PIN next
            return res.json({
                verified: true,
                message: 'OTP verified. Please set your PIN to continue.'
            });
        } catch (error: any) {
            console.error('Error verifying invite OTP:', error);
            return res.status(400).json({
                message: error.message || 'Failed to verify OTP'
            });
        }
    });

    // Set PIN and activate account (second step after OTP verification)
    app.post('/groups/:id/invite/set-pin', async (req, res) => {
        try {
            const { id } = req.params;
            const { phone, pin } = req.body as { phone: string; pin: string };

            if (!phone || !pin) {
                return res.status(400).json({ message: 'Phone and PIN are required' });
            }

            if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
                return res.status(400).json({ message: 'PIN must be exactly 4 digits' });
            }

            const user = await User.findOne({ where: { phone } });
            if (!user) {
                return res.status(404).json({ message: 'User not found. Please verify OTP first.' });
            }

            // Verify that OTP was previously verified (OTP should still be valid or recently verified)
            // If PIN already set, don't allow setting again via this endpoint
            if (user.pin_set && user.pin) {
                return res.status(400).json({ message: 'PIN already set. Please login with your PIN instead.' });
            }

            // Find the pending share
            const pendingShare = await GroupUserShare.findOne({
                where: {
                    group_id: id,
                    user_id: user.id,
                    status: 'pending'
                }
            });

            if (!pendingShare) {
                return res.status(404).json({ message: 'No pending invite found for this phone number in this group' });
            }

            // Hash PIN using bcrypt
            const bcrypt = require('bcrypt');
            const hashedPin = await bcrypt.hash(pin, 10);

            // Set PIN, activate user, and clear OTP
            user.pin = hashedPin;
            user.pin_set = true;
            user.status = 'active';
            user.otp = null;
            user.otp_expires_at = null as any;
            await user.save();

            // Accept the invite
            pendingShare.status = 'accepted';
            await pendingShare.save();

            // Generate JWT token for immediate login
            const jwt = require('jsonwebtoken');
            const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

            console.log(`✅ User ${user.id} activated with PIN. Invite accepted for group ${id}`);

            return res.json({
                token,
                role: user.role,
                message: 'PIN set successfully. Account activated and invite accepted.'
            });
        } catch (error: any) {
            console.error('Error setting PIN:', error);
            return res.status(400).json({
                message: error.message || 'Failed to set PIN'
            });
        }
    });

    // Get shares for a group
    app.get('/groups/:id/shares', async (req, res) => {
        try {
            const { id } = req.params;
            const shares = await GroupUserShare.findAll({
                where: { group_id: id },
                include: [{
                    model: User,
                    attributes: ['id', 'name', 'phone'],
                    required: false
                }],
                order: [['created_at', 'ASC']]
            });

            return res.json(shares.map(s => ({
                ...s.toJSON(),
                user: s.user_id ? {
                    id: (s as any).User?.id,
                    name: (s as any).User?.name,
                    phone: (s as any).User?.phone || s.phone
                } : null
            })));
        } catch (error: any) {
            console.error('Error fetching shares:', error);
            return res.status(400).json({
                message: error.message || 'Failed to fetch shares'
            });
        }
    });

    // Send invite for share
    app.post('/groups/:id/invite', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, phone, share_percent, share_no, invited_by, can_invite } = req.body as {
                name?: string;
                phone: string;
                share_percent: number;
                share_no?: number; // Optional: specify which share number, otherwise auto-assign
                invited_by?: string;
                can_invite?: boolean; // Permission for invited user to invite others
            };

            if (!phone || !share_percent) {
                return res.status(400).json({
                    message: 'Phone and share_percent are required'
                });
            }

            const group = await Group.findByPk(id);
            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            // Check if group status is 'new'
            if (group.status !== 'new') {
                return res.status(400).json({
                    message: 'Can only invite members to new groups'
                });
            }

            // Calculate available shares
            const shares = await GroupUserShare.findAll({
                where: { group_id: id }
            });

            const totalShareCount = group.number_of_members || 0;

            // Group shares by share_no
            const sharesByNumber = new Map<number, any[]>();
            shares.forEach(s => {
                const shareNo = s.share_no;
                if (!sharesByNumber.has(shareNo)) {
                    sharesByNumber.set(shareNo, []);
                }
                sharesByNumber.get(shareNo)!.push(s);
            });

            let targetShareNo: number;
            let availablePercent: number;

            if (share_no) {
                // User specified a share number
                if (share_no < 1 || share_no > totalShareCount) {
                    return res.status(400).json({
                        message: `Share number must be between 1 and ${totalShareCount}`
                    });
                }

                const existingSharesForThisNumber = sharesByNumber.get(share_no) || [];
                const allocatedPercent = existingSharesForThisNumber.reduce((sum, s) => sum + parseFloat(s.share_percent.toString()), 0);
                availablePercent = 100 - allocatedPercent;

                if (availablePercent <= 0) {
                    return res.status(400).json({
                        message: `Share #${share_no} is already complete (100% allocated)`
                    });
                }

                if (share_percent > availablePercent) {
                    return res.status(400).json({
                        message: `Share #${share_no} only has ${availablePercent.toFixed(2)}% available (${allocatedPercent.toFixed(2)}% already allocated). Maximum: ${availablePercent.toFixed(2)}%`
                    });
                }

                targetShareNo = share_no;
            } else {
                // Auto-assign to first available share
                // Prioritize incomplete shares first, then empty shares
                const incompleteShareNumbers: number[] = [];
                const emptyShareNumbers: number[] = [];

                for (let i = 1; i <= totalShareCount; i++) {
                    const shareGroup = sharesByNumber.get(i) || [];
                    const totalPercent = shareGroup.reduce((sum, s) => sum + parseFloat(s.share_percent.toString()), 0);
                    if (shareGroup.length === 0) {
                        // Empty share - 100% available
                        emptyShareNumbers.push(i);
                    } else if (totalPercent < 100) {
                        // Incomplete share - partial available
                        incompleteShareNumbers.push(i);
                    }
                }

                if (incompleteShareNumbers.length === 0 && emptyShareNumbers.length === 0) {
                    return res.status(400).json({
                        message: 'All shares are already complete (100% each)'
                    });
                }

                // Prioritize incomplete shares first, then empty shares
                targetShareNo = incompleteShareNumbers.length > 0
                    ? incompleteShareNumbers[0]
                    : emptyShareNumbers[0];

                const existingSharesForThisNumber = sharesByNumber.get(targetShareNo) || [];
                const allocatedPercent = existingSharesForThisNumber.reduce((sum, s) => sum + parseFloat(s.share_percent.toString()), 0);
                availablePercent = 100 - allocatedPercent;

                if (share_percent > availablePercent) {
                    return res.status(400).json({
                        message: `Share #${targetShareNo} only has ${availablePercent.toFixed(2)}% available (${allocatedPercent.toFixed(2)}% already allocated). Maximum: ${availablePercent.toFixed(2)}%`
                    });
                }
            }

            // Check if user already has a share/invite for this share number
            const existingShare = await GroupUserShare.findOne({
                where: {
                    group_id: id,
                    phone: phone,
                    share_no: targetShareNo,
                    status: { [Op.in]: ['pending', 'accepted', 'active'] }
                }
            });

            if (existingShare) {
                return res.status(400).json({
                    message: `User already has a pending or active share for Share #${targetShareNo}`
                });
            }

            // Get current user from token if available (for referral tracking)
            let currentUserId: string | null = null;
            try {
                const authHeader = req.headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];
                if (token) {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { sub: string };
                    currentUserId = decoded.sub;
                }
            } catch (e) {
                // Token not available or invalid, use invited_by if provided
            }

            // Get inviter's user_id (current user who is sending the invite)
            const inviterUserId = invited_by || currentUserId;

            // Find or create user by phone with inactive status
            // Group invite flow: Set referred_by to the inviter's id
            const [invitedUser, created] = await User.findOrCreate({
                where: { phone },
                defaults: {
                    phone,
                    name: name || null,
                    status: 'inactive', // New users created via invite are inactive
                    referred_by: inviterUserId || null // Set referred_by to the inviter's id (from group invite)
                }
            });

            // If user already existed but referred_by is not set, update it with inviter's id
            if (!created && !invitedUser.referred_by && inviterUserId) {
                invitedUser.referred_by = inviterUserId;
                // Also update name if provided
                if (name && name.trim() && !invitedUser.name) {
                    invitedUser.name = name.trim();
                }
                await invitedUser.save();
                console.log(`✅ Updated existing user ${invitedUser.id} - referred_by set to inviter ${inviterUserId}`);
            } else if (created && inviterUserId) {
                console.log(`✅ New user ${invitedUser.id} created via invite - referred_by set to inviter ${inviterUserId}`);
            } else if (!created && name && name.trim()) {
                // Update name if provided and user already existed (but don't override referred_by)
                await invitedUser.update({ name: name.trim() });
            }

            // Calculate contribution amount (share_percent of full group amount)
            const groupAmount = parseFloat(group.amount.toString());
            const contributionAmount = (groupAmount * share_percent) / 100;

            // Generate OTP for invite
            const otp = generateOtp();
            const otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Generate invite link (before creating share invite so we can save it)
            const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/groups/${id}/invite?phone=${encodeURIComponent(phone)}`;

            // Create share invite
            const shareInvite = await GroupUserShare.create({
                group_id: id,
                user_id: invitedUser.id,
                phone: phone,
                share_no: targetShareNo,
                share_percent: share_percent,
                contribution_amount: contributionAmount,
                status: 'pending',
                invited_by: invited_by || currentUserId || null,
                can_invite: can_invite === true, // Permission to invite others
                invite_otp: otp,
                invite_otp_expires_at: otpExpires,
                invite_link: inviteLink // Save invite link for resending
            });

            // Calculate remaining percentage for this share
            const updatedSharesForThisNumber = [...(sharesByNumber.get(targetShareNo) || []), shareInvite];
            const newAllocatedPercent = updatedSharesForThisNumber.reduce((sum, s) => sum + parseFloat(s.share_percent.toString()), 0);
            const remainingPercent = 100 - newAllocatedPercent;

            // Get invite method from request body (user's choice: 'sms', 'whatsapp', or 'both')
            const inviteVia = (req.body as any).invite_via || (process.env.TWILIO_SEND_VIA as 'sms' | 'whatsapp' | 'both') || 'both';

            // Send invite via SMS/WhatsApp (Parked for now - Twilio disabled)
            // When Twilio is enabled, uncomment below and use inviteVia instead of sendMethod
            // const inviteResult = await sendInvite(
            //     phone,
            //     inviteLink,
            //     group.name,
            //     undefined, // Don't send OTP in initial invite - user will request it
            //     inviteVia
            // );

            console.log(`📱 [DEV] Invite link generated for ${phone} in group "${group.name}"`);
            console.log(`   Link: ${inviteLink}`);
            console.log(`   Method: ${inviteVia} (SMS: ${inviteVia === 'sms' || inviteVia === 'both'}, WhatsApp: ${inviteVia === 'whatsapp' || inviteVia === 'both'})`);
            console.log(`   Share #${targetShareNo}, OTP: ${otp}`);
            // console.log(`   SMS SID: ${inviteResult.smsSid || 'Not sent'}`);
            // console.log(`   WhatsApp SID: ${inviteResult.whatsappSid || 'Not sent'}`);

            // For development, return OTP and link
            const isProd = process.env.DEPLOY_ENV === 'production';

            const methodLabels: Record<string, string> = {
                'sms': 'SMS',
                'whatsapp': 'WhatsApp',
                'both': 'SMS & WhatsApp'
            };

            return res.json({
                message: `Invite sent successfully for Share #${targetShareNo}. Will send via ${methodLabels[inviteVia] || inviteVia}.`,
                share: shareInvite.toJSON(),
                share_no: targetShareNo,
                allocated_percent: newAllocatedPercent,
                remaining_percent: remainingPercent,
                share_status: remainingPercent === 0 ? 'complete' : 'incomplete',
                invite_link: inviteLink,
                invite_via: inviteVia, // Return the selected method
                share_id: shareInvite.id, // Return share ID for resending
                ...(isProd ? {} : { otp }) // Only return OTP in development
            });
        } catch (error: any) {
            console.error('Error sending invite:', error);
            return res.status(400).json({
                message: error.message || 'Failed to send invite'
            });
        }
    });

    // Resend invite link
    app.post('/groups/:id/invite/:shareId/resend', authenticateToken, async (req, res) => {
        try {
            const { id, shareId } = req.params;
            const { invite_via } = req.body as { invite_via?: 'sms' | 'whatsapp' | 'both' };

            // Find the share invite
            const shareInvite = await GroupUserShare.findOne({
                where: {
                    id: shareId,
                    group_id: id,
                    status: 'pending'
                }
            });

            if (!shareInvite) {
                return res.status(404).json({
                    message: 'Pending invite not found'
                });
            }

            // Verify the current user is the creator or the one who invited
            const currentUserId = (req as AuthRequest).user?.id;
            if (shareInvite.invited_by !== currentUserId && shareInvite.group_id) {
                const group = await Group.findByPk(id);
                if (group?.created_by !== currentUserId) {
                    return res.status(403).json({
                        message: 'You do not have permission to resend this invite'
                    });
                }
            }

            // Use saved invite link or generate new one
            const inviteLink = shareInvite.invite_link ||
                `${process.env.FRONTEND_URL || 'http://localhost:5173'}/groups/${id}/invite?phone=${encodeURIComponent(shareInvite.phone || '')}`;

            // Update invite link if it wasn't saved
            if (!shareInvite.invite_link) {
                shareInvite.invite_link = inviteLink;
                await shareInvite.save();
            }

            const group = await Group.findByPk(id);
            const groupName = group?.name || 'this group';

            // Resend invite via SMS/WhatsApp (Parked for now - Twilio disabled)
            const sendMethod = invite_via || (process.env.TWILIO_SEND_VIA as 'sms' | 'whatsapp' | 'both') || 'both';
            // When Twilio is enabled, uncomment below:
            // const inviteResult = await sendInvite(
            //     shareInvite.phone || '',
            //     inviteLink,
            //     groupName,
            //     undefined,
            //     sendMethod
            // );

            console.log(`📱 [DEV] Resending invite link for Share #${shareInvite.share_no}`);
            console.log(`   Phone: ${shareInvite.phone}`);
            console.log(`   Link: ${inviteLink}`);
            console.log(`   Method: ${sendMethod}`);

            const methodLabels: Record<string, string> = {
                'sms': 'SMS',
                'whatsapp': 'WhatsApp',
                'both': 'SMS & WhatsApp'
            };

            return res.json({
                message: `Invite link resent successfully via ${methodLabels[sendMethod] || sendMethod}`,
                invite_link: inviteLink,
                invite_via: sendMethod
            });
        } catch (error: any) {
            console.error('Error resending invite:', error);
            return res.status(400).json({
                message: error.message || 'Failed to resend invite'
            });
        }
    });

    // Accept invite
    app.post('/groups/:id/invite/accept', async (req, res) => {
        try {
            const { id } = req.params;
            const { phone, otp } = req.body as { phone: string; otp: string };

            if (!phone || !otp) {
                return res.status(400).json({
                    message: 'Phone and OTP are required'
                });
            }

            const share = await GroupUserShare.findOne({
                where: {
                    group_id: id,
                    phone: phone,
                    status: 'pending'
                }
            });

            if (!share) {
                return res.status(404).json({
                    message: 'Pending invite not found'
                });
            }

            // Verify OTP
            if (!share.invite_otp || !share.invite_otp_expires_at) {
                return res.status(400).json({
                    message: 'Invalid invite'
                });
            }

            const expiresAtMs = new Date(share.invite_otp_expires_at as any).getTime();
            if (share.invite_otp !== otp || expiresAtMs < Date.now()) {
                return res.status(400).json({
                    message: 'Invalid or expired OTP'
                });
            }

            // Get or create user
            let user = await User.findByPk(share.user_id || undefined);
            if (!user) {
                // Create user if doesn't exist
                user = await User.create({
                    phone: phone
                });
            }

            // Update user's referred_by if invite was from another user
            // Group invite flow: Set referred_by to the inviter's id (from invited_by in GroupUserShare)
            if (share.invited_by && !user.referred_by) {
                user.referred_by = share.invited_by;
                await user.save();
                console.log(`✅ Invite acceptance: User ${user.id} referred by ${share.invited_by} (from group invite)`);
            } else if (!user.referred_by) {
                // Fallback: If no inviter and no referred_by, set to self (shouldn't happen in invite flow)
                user.referred_by = user.id;
                await user.save();
                console.log(`⚠️ No inviter found, setting self-referral for user ${user.id}`);
            }

            // Update share status to accepted and link to user
            share.status = 'accepted';
            share.user_id = user.id;
            share.invite_otp = null;
            share.invite_otp_expires_at = null;
            await share.save();

            return res.json({
                message: 'Invite accepted successfully',
                share: share.toJSON(),
                user: {
                    id: user.id,
                    phone: user.phone,
                    referred_by: user.referred_by
                }
            });
        } catch (error: any) {
            console.error('Error accepting invite:', error);
            return res.status(400).json({
                message: error.message || 'Failed to accept invite'
            });
        }
    });

    // Delete group (only if status is 'new')
    app.delete('/groups/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Get current user from token if available
            let currentUserId: string | null = null;
            try {
                const authHeader = req.headers['authorization'];
                const token = authHeader && authHeader.split(' ')[1];
                if (token) {
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { sub: string };
                    currentUserId = decoded.sub;
                }
            } catch (e) {
                // Token not available or invalid
            }

            if (!currentUserId) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const group = await Group.findByPk(id);

            if (!group) {
                return res.status(404).json({ message: 'Group not found' });
            }

            // Only allow deletion if user is the creator
            if (group.created_by !== currentUserId) {
                return res.status(403).json({ message: 'Only the group creator can delete this group' });
            }

            // Only allow deletion if group status is 'new'
            if (group.status !== 'new') {
                return res.status(400).json({
                    message: `Cannot delete group with status '${group.status}'. Only groups with status 'new' can be deleted.`
                });
            }

            // Delete all associated records first (due to foreign key constraints)
            // Delete group features
            await GroupFeature.destroy({
                where: { group_id: id }
            });
            console.log(`✅ Deleted group features for group ${id}`);

            // Delete group user shares
            const deletedShares = await GroupUserShare.destroy({
                where: { group_id: id }
            });
            console.log(`✅ Deleted ${deletedShares} group user shares for group ${id}`);

            // Delete any receivables (if they exist)
            try {
                const deletedReceivables = await Receivable.destroy({
                    where: { group_id: id }
                });
                if (deletedReceivables > 0) {
                    console.log(`✅ Deleted ${deletedReceivables} receivables for group ${id}`);
                }
            } catch (e) {
                // Receivables table might not exist or have issues - continue
            }

            // Finally, delete the group itself
            await group.destroy();
            console.log(`✅ Deleted group ${id}`);

            return res.json({
                message: 'Group and all associated records deleted successfully',
                deleted: {
                    group: true,
                    shares: deletedShares,
                    features: true
                }
            });
        } catch (error: any) {
            console.error('Error deleting group:', error);
            return res.status(400).json({
                message: error.message || 'Failed to delete group'
            });
        }
    });
}




