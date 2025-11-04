import { Server as SocketIOServer } from 'socket.io';
import { Group } from '../models/Group';
import { GroupAccount } from '../models/GroupAccount';
import { GroupUserShare } from '../models/GroupUserShare';
import { GroupFeature } from '../models/GroupFeature';
import { User } from '../models/User';
import { Auction } from '../models/Auction';
import { Op } from 'sequelize';

/**
 * Calculate minimum bid amount (above commission)
 * Minimum bid = Group amount + Commission
 */
function calculateMinimumBid(groupAmount: number, commission: number): number {
    return parseFloat((Number(groupAmount) + Number(commission)).toFixed(2));
}

/**
 * Open an auction for a group
 * Creates a GroupAccount with status "open" and notifies all group members
 */
export async function openAuction(groupId: string, io: SocketIOServer): Promise<void> {
    try {
        console.log(`🎯 Opening auction for group: ${groupId}`);

        // Check if auction already exists and is open
        const existingAccount = await GroupAccount.findOne({
            where: {
                group_id: groupId,
                status: 'open'
            }
        });

        if (existingAccount) {
            console.log(`⚠️ Auction already open for group ${groupId}`);
            return;
        }

        // Get group details
        const group = await Group.findByPk(groupId);
        if (!group) {
            console.error(`❌ Group not found: ${groupId}`);
            return;
        }

        // Get group features to calculate commission
        const features = await GroupFeature.findAll({
            where: { group_id: groupId }
        });

        // Calculate commission (same as billing_charges)
        const commission = group.billing_charges || 0;
        const minimumBid = calculateMinimumBid(group.amount, commission);

        // Create GroupAccount with status "open"
        const groupAccount = await GroupAccount.create({
            group_id: groupId,
            auction_amount: 0, // Will be updated when bids are placed
            commission: commission,
            cash_to_customer: 0,
            balance: 0,
            profit_per_person: 0,
            status: 'open',
            winner_share_id: null
        });

        console.log(`✅ Created GroupAccount for auction: ${groupAccount.id}`);

        // Get all active group members (users with accepted/active shares)
        const shares = await GroupUserShare.findAll({
            where: {
                group_id: groupId,
                status: { [Op.in]: ['accepted', 'active'] },
                user_id: { [Op.ne]: null }
            }
        });

        // Get user IDs for notifications
        const userIds = shares
            .map(share => share.user_id)
            .filter((id): id is string => id !== null);

        // Broadcast auction opened event to all group members
        const auctionData = {
            group_id: groupId,
            group_name: group.name,
            group_account_id: groupAccount.id,
            minimum_bid: minimumBid,
            commission: commission,
            group_amount: group.amount,
            auction_start_at: group.auction_start_at ? new Date(group.auction_start_at).toISOString() : null,
            auction_end_at: group.auction_end_at ? new Date(group.auction_end_at).toISOString() : null,
            opened_at: new Date().toISOString()
        };

        // Emit to specific room for this group
        io.to(`group:${groupId}`).emit('auction:opened', auctionData);

        // Also emit to all users who are members of this group
        userIds.forEach(userId => {
            io.to(`user:${userId}`).emit('auction:opened', auctionData);
        });

        // Broadcast globally as well (for users who might be viewing the group)
        io.emit('auction:opened', auctionData);

        console.log(`📢 Notified ${userIds.length} members about auction opening for group ${groupId}`);

    } catch (error) {
        console.error(`❌ Error opening auction for group ${groupId}:`, error);
        throw error;
    }
}

/**
 * Close an auction for a group
 * Updates GroupAccount status to "closed" and determines winner
 */
export async function closeAuction(groupId: string, io: SocketIOServer): Promise<void> {
    try {
        console.log(`🔒 Closing auction for group: ${groupId}`);

        // Find open auction account
        const groupAccount = await GroupAccount.findOne({
            where: {
                group_id: groupId,
                status: 'open'
            }
        });

        if (!groupAccount) {
            console.log(`⚠️ No open auction found for group ${groupId}`);
            return;
        }

        // Get the winning bid (highest bid)
        const winningBid = await Auction.findOne({
            where: {
                group_account_id: groupAccount.id,
                is_winning_bid: true
            },
            order: [['amount', 'DESC']]
        });

        if (winningBid) {
            // Update GroupAccount with winner
            await groupAccount.update({
                status: 'closed',
                winner_share_id: winningBid.group_usershare_id,
                auction_amount: winningBid.amount
            });

            console.log(`✅ Auction closed with winner: Share ${winningBid.group_usershare_id}, Amount: ${winningBid.amount}`);
        } else {
            // No bids received
            await groupAccount.update({
                status: 'closed'
            });
            console.log(`⚠️ Auction closed with no bids for group ${groupId}`);
        }

        // Broadcast auction closed event
        const auctionData = {
            group_id: groupId,
            group_account_id: groupAccount.id,
            winner_share_id: groupAccount.winner_share_id,
            winning_amount: groupAccount.auction_amount,
            closed_at: new Date().toISOString()
        };

        io.to(`group:${groupId}`).emit('auction:closed', auctionData);
        io.emit('auction:closed', auctionData);

        console.log(`📢 Notified members about auction closing for group ${groupId}`);

    } catch (error) {
        console.error(`❌ Error closing auction for group ${groupId}:`, error);
        throw error;
    }
}

