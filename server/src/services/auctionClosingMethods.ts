import { Server as SocketIOServer } from 'socket.io';
import { Group } from '../models/Group';
import { GroupAccount } from '../models/GroupAccount';
import { GroupUserShare } from '../models/GroupUserShare';
import { Auction } from '../models/Auction';
import { Receivable, Payable } from '../models/Finance';
import { Op } from 'sequelize';
import { calculateNextAuctionDate } from '../utils/auctionDateUtils';

/**
 * Interface for auction closing methods
 * Allows for future expansion with different closing types
 */
export interface AuctionClosingMethod {
    close(groupId: string, io: SocketIOServer): Promise<void>;
}

/**
 * Deductive method for closing auctions
 * - Finds highest bidder
 * - Updates group_accounts with winner and status
 * - Calculates and updates next_auction_date
 */
export class CloseDeductiveMethod implements AuctionClosingMethod {
    async close(groupId: string, io: SocketIOServer): Promise<void> {
        try {
            // Find open auction account
            const groupAccount = await GroupAccount.findOne({
                where: {
                    group_id: groupId,
                    status: 'open'
                }
            });

            if (!groupAccount) {
                console.log(`⚠️ [Auction Status] No open auction found for group ${groupId}`);
                return;
            }

            // Get group details
            const group = await Group.findByPk(groupId);
            if (!group) {
                console.error(`❌ [Auction Status] Group not found: ${groupId}`);
                return;
            }

            // Find the winning bid (highest bid amount)
            // If multiple bids with same amount, use the earliest one
            const winningBid = await Auction.findOne({
                where: {
                    group_account_id: groupAccount.id
                },
                order: [
                    ['amount', 'DESC'],
                    ['created_at', 'ASC'] // Earlier bid wins if same amount
                ]
            });

            // Get group amount and number of members
            const groupAmount = Number(group.amount) || 0;
            const numberOfMembers = group.number_of_members || 1;
            const commission = Number(group.billing_charges) || 0;

            let auctionAmount = 0;
            let cashToCustomer = 0;
            let balance = 0;
            let profitPerPerson = 0;

            if (winningBid) {
                auctionAmount = Number(winningBid.amount);
                
                // Calculate values:
                // cash_to_customer = Group amount - auction_amount
                cashToCustomer = groupAmount - auctionAmount;
                
                // balance = auction_amount - commission
                balance = auctionAmount - commission;
                
                // profit_per_person = balance / number_of_members
                profitPerPerson = numberOfMembers > 0 ? balance / numberOfMembers : 0;

                // Update GroupAccount with all calculated values
                await groupAccount.update({
                    status: 'closed',
                    winner_share_id: winningBid.group_usershare_id,
                    auction_amount: auctionAmount,
                    commission: commission,
                    cash_to_customer: cashToCustomer,
                    balance: balance,
                    profit_per_person: profitPerPerson
                });

                console.log(`✅ [Auction Status] Auction closed with winner: Share ${winningBid.group_usershare_id}`);
                console.log(`   Auction Amount: ₹${auctionAmount.toFixed(2)}`);
                console.log(`   Commission: ₹${commission.toFixed(2)}`);
                console.log(`   Cash to Customer: ₹${cashToCustomer.toFixed(2)}`);
                console.log(`   Balance: ₹${balance.toFixed(2)}`);
                console.log(`   Profit per Person: ₹${profitPerPerson.toFixed(2)}`);
            } else {
                // No bids received - set all values to 0
                await groupAccount.update({
                    status: 'closed',
                    auction_amount: 0,
                    commission: commission,
                    cash_to_customer: 0,
                    balance: 0,
                    profit_per_person: 0
                });
                console.log(`⚠️ [Auction Status] Auction closed with no bids for group ${groupId}`);
            }

            // Get all active group members (users with accepted/active shares)
            const allShares = await GroupUserShare.findAll({
                where: {
                    group_id: groupId,
                    status: { [Op.in]: ['accepted', 'active'] },
                    user_id: { [Op.ne]: null }
                }
            });

            // Update Receivable for each user
            // Receivable = contribution_amount - profit_per_person
            for (const share of allShares) {
                if (share.user_id && share.contribution_amount) {
                    const contributionAmount = Number(share.contribution_amount);
                    const expectedAmount = Math.max(0, contributionAmount - profitPerPerson);
                    
                    // Create or update Receivable
                    await Receivable.create({
                        group_id: groupId,
                        user_id: share.user_id,
                        group_share_id: share.id,
                        expected_amount: expectedAmount,
                        status: 'pending'
                    });
                    
                    console.log(`📝 [Auction Status] Created Receivable for user ${share.user_id}: ₹${expectedAmount.toFixed(2)} (Contribution: ₹${contributionAmount.toFixed(2)} - Profit: ₹${profitPerPerson.toFixed(2)})`);
                }
            }

            // Update Payable for winner (if there is a winner)
            // Payable = group_amount - auction_amount (cash_to_customer)
            if (winningBid && winningBid.user_id && cashToCustomer > 0) {
                await Payable.create({
                    group_id: groupId,
                    user_id: winningBid.user_id,
                    amount: cashToCustomer
                });
                
                console.log(`💰 [Auction Status] Created Payable for winner (user ${winningBid.user_id}): ₹${cashToCustomer.toFixed(2)}`);
            }

            // Calculate next auction date based on current next_auction_date and frequency
            if (group.next_auction_date) {
                const nextDate = calculateNextAuctionDate(
                    new Date(group.next_auction_date),
                    group.auction_frequency as 'weekly' | 'biweekly' | 'monthly' | null
                );

                // Update group with next auction date
                await group.update({
                    next_auction_date: nextDate
                });

                console.log(`📅 [Auction Status] Next auction date calculated: ${nextDate.toISOString()}`);
            } else {
                console.log(`⚠️ [Auction Status] No next_auction_date set for group ${groupId}, skipping date calculation`);
            }

            // Get unique user IDs for notifications (deduplicate in case user has multiple shares)
            const userIds = Array.from(new Set(
                allShares
                    .map(share => share.user_id)
                    .filter((id): id is string => id !== null)
            ));

            // Broadcast auction closed event
            const auctionData = {
                group_id: groupId,
                group_name: group.name,
                group_account_id: groupAccount.id,
                winner_share_id: groupAccount.winner_share_id,
                winning_amount: groupAccount.auction_amount,
                auction_amount: auctionAmount,
                commission: commission,
                cash_to_customer: cashToCustomer,
                balance: balance,
                profit_per_person: profitPerPerson,
                next_auction_date: group.next_auction_date ? new Date(group.next_auction_date).toISOString() : null,
                closed_at: new Date().toISOString(),
                message: 'Auction closed'
            };

            // Emit to group room (for users who joined the room)
            io.to(`group:${groupId}`).emit('auction:closed', auctionData);

            // Also emit to all users who are members of this group (from database)
            userIds.forEach(userId => {
                io.to(`user:${userId}`).emit('auction:closed', auctionData);
            });
            
            // Also emit globally for users who might be viewing
            io.emit('auction:closed', auctionData);

            console.log(`📢 [Auction Status] Notified ${userIds.length} members about auction closing for group ${groupId}`);

        } catch (error) {
            console.error(`❌ [Auction Status] Error closing auction (Deductive Method) for group ${groupId}:`, error);
            throw error;
        }
    }
}


