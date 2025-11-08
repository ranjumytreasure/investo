import { Server as SocketIOServer } from 'socket.io';
import { sequelize } from '../lib/sequelize';
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
        const transaction = await sequelize.transaction();
        let broadcastPayload: any = null;
        let userIds: string[] = [];

        try {
            // Find open auction account
            const groupAccount = await GroupAccount.findOne({
                where: {
                    group_id: groupId,
                    status: 'open'
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!groupAccount) {
                await transaction.rollback();
                console.log(`⚠️ [Auction Status] No open auction found for group ${groupId}`);
                return;
            }

            // Get group details
            const group = await Group.findByPk(groupId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });
            if (!group) {
                await transaction.rollback();
                console.error(`❌ [Auction Status] Group not found: ${groupId}`);
                return;
            }

            // Find the winning bid (latest bid wins)
            const winningBid = await Auction.findOne({
                where: {
                    group_account_id: groupAccount.id
                },
                order: [
                    ['created_at', 'DESC']
                ],
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            // Get all active group members (users with accepted/active shares)
            const allShares = await GroupUserShare.findAll({
                where: {
                    group_id: groupId,
                    status: { [Op.in]: ['accepted', 'active'] },
                    user_id: { [Op.ne]: null }
                },
                transaction
            });

            userIds = Array.from(new Set(
                allShares
                    .map(share => share.user_id)
                    .filter((id): id is string => id !== null)
            ));

            const groupAmount = Number(group.amount) || 0;
            const numberOfMembers = group.number_of_members || 1;
            const commission = Number(group.billing_charges) || 0;

            let auctionAmount = 0;
            let cashToCustomer = 0;
            let balance = 0;
            let profitPerPerson = 0;

            const hasWinningBid = Boolean(winningBid);

            if (!hasWinningBid) {
                // No bids – remove any stray receivables and delete the group account
                await Receivable.destroy({
                    where: {
                        group_account_id: groupAccount.id
                    },
                    transaction
                });

                await groupAccount.destroy({ transaction });
                console.log(`🗑️ [Auction Status] Deleted group account ${groupAccount.id} for group ${groupId} due to no bids.`);

                broadcastPayload = {
                    group_id: groupId,
                    group_name: group.name,
                    group_account_id: null,
                    winner_share_id: null,
                    winning_amount: 0,
                    auction_amount: 0,
                    commission: 0,
                    cash_to_customer: 0,
                    balance: 0,
                    profit_per_person: 0,
                    next_auction_date: group.next_auction_date ? new Date(group.next_auction_date).toISOString() : null,
                    closed_at: new Date().toISOString(),
                    message: 'Auction closed with no bids'
                };
            } else {
                auctionAmount = Number(winningBid!.amount);
                cashToCustomer = groupAmount - auctionAmount;
                balance = auctionAmount - commission;
                profitPerPerson = numberOfMembers > 0 ? balance / numberOfMembers : 0;

                await groupAccount.update({
                    status: 'closed',
                    winner_share_id: winningBid!.group_usershare_id,
                    auction_amount: auctionAmount,
                    commission: commission,
                    cash_to_customer: cashToCustomer,
                    balance: balance,
                    profit_per_person: profitPerPerson
                }, { transaction });

                // Rebuild receivables based on the winning bid outcome
                await Receivable.destroy({
                    where: {
                        group_account_id: groupAccount.id
                    },
                    transaction
                });

                const sharePercentMap = new Map<string, number>();
                let totalShareUnits = 0;
                for (const share of allShares) {
                    const percentRaw = Number(share.share_percent);
                    const percent = !Number.isFinite(percentRaw) || percentRaw <= 0 ? 100 : percentRaw;
                    sharePercentMap.set(share.id, percent);
                    totalShareUnits += percent / 100;
                }
                if (totalShareUnits <= 0) {
                    const memberCount = Number(group.number_of_members || 0);
                    totalShareUnits = memberCount > 0 ? memberCount : 1;
                }

                const duePerFullShare = Math.max(0, (groupAmount / totalShareUnits) - profitPerPerson);

                for (const share of allShares) {
                    if (!share.user_id) {
                        continue;
                    }
                    const sharePercent = sharePercentMap.get(share.id) ?? 0;
                    const shareFraction = sharePercent / 100;
                    const expectedAmount = parseFloat((duePerFullShare * shareFraction).toFixed(2));

                    await Receivable.create({
                        group_id: groupId,
                        group_account_id: groupAccount.id,
                        user_id: share.user_id,
                        group_share_id: share.id,
                        due_amount: expectedAmount,
                        status: 'pending'
                    }, { transaction });

                    console.log(`📝 [Auction Status] Created Receivable for user ${share.user_id}: ₹${expectedAmount.toFixed(2)} (Share: ${sharePercent}% of ₹${duePerFullShare.toFixed(2)})`);
                }

                if (cashToCustomer > 0) {
                    let winningShareRecord = allShares.find(share => share.id === winningBid!.group_usershare_id);

                    if (!winningShareRecord && winningBid!.group_usershare_id) {
                        const fetchedShare = await GroupUserShare.findByPk(winningBid!.group_usershare_id, { transaction });
                        if (fetchedShare) {
                            winningShareRecord = fetchedShare;
                            allShares.push(fetchedShare);
                        }
                    }

                    if (winningShareRecord && winningShareRecord.share_no !== undefined && winningShareRecord.share_no !== null) {
                        const coOwners = allShares.filter(share => {
                            return share.share_no === winningShareRecord!.share_no;
                        });

                        const totalCoOwnerPercent = coOwners.reduce((sum, share) => {
                            const percent = Number(share.share_percent) || 0;
                            return sum + percent;
                        }, 0) || 100;

                        for (const share of coOwners) {
                            if (!share.user_id) {
                                continue;
                            }

                            const sharePercent = Number(share.share_percent) || 0;
                            const payoutFraction = sharePercent / totalCoOwnerPercent;
                            const payoutAmount = parseFloat((cashToCustomer * payoutFraction).toFixed(2));

                            if (payoutAmount <= 0) {
                                continue;
                            }

                            await Payable.create({
                                group_id: groupId,
                                user_id: share.user_id,
                                amount: payoutAmount
                            }, { transaction });

                            console.log(`💰 [Auction Status] Created Payable for user ${share.user_id}: ₹${payoutAmount.toFixed(2)} (Share ${share.share_no} - ${sharePercent}%)`);
                        }
                    } else if (winningBid!.user_id) {
                        await Payable.create({
                            group_id: groupId,
                            user_id: winningBid!.user_id,
                            amount: cashToCustomer
                        }, { transaction });

                        console.log(`💰 [Auction Status] Created Payable for winner (user ${winningBid!.user_id}): ₹${cashToCustomer.toFixed(2)}`);
                    }
                }

                // Calculate next auction date based on the configured frequency
                let baseDate: Date;
                if (group.next_auction_date) {
                    baseDate = new Date(group.next_auction_date);
                } else if (group.auction_start_at) {
                    baseDate = new Date(group.auction_start_at);
                } else if (winningBid!.created_at) {
                    baseDate = new Date(winningBid!.created_at);
                } else {
                    baseDate = new Date();
                }

                const nextDate = calculateNextAuctionDate(
                    baseDate,
                    group.auction_frequency as 'daily' | 'weekly' | 'biweekly' | 'monthly' | null
                );

                await group.update({
                    next_auction_date: nextDate
                }, { transaction });

                console.log(`📅 [Auction Status] Next auction date calculated: ${nextDate.toISOString()}`);

                broadcastPayload = {
                    group_id: groupId,
                    group_name: group.name,
                    group_account_id: groupAccount.id,
                    winner_share_id: winningBid!.group_usershare_id,
                    winning_amount: auctionAmount,
                    auction_amount: auctionAmount,
                    commission: commission,
                    cash_to_customer: cashToCustomer,
                    balance: balance,
                    profit_per_person: profitPerPerson,
                    next_auction_date: nextDate.toISOString(),
                    closed_at: new Date().toISOString(),
                    message: 'Auction closed'
                };

                console.log(`✅ [Auction Status] Auction closed with winner: Share ${winningBid!.group_usershare_id}`);
                console.log(`   Auction Amount: ₹${auctionAmount.toFixed(2)}`);
                console.log(`   Commission: ₹${commission.toFixed(2)}`);
                console.log(`   Cash to Customer: ₹${cashToCustomer.toFixed(2)}`);
                console.log(`   Balance: ₹${balance.toFixed(2)}`);
                console.log(`   Profit per Person: ₹${profitPerPerson.toFixed(2)}`);
            }

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            console.error(`❌ [Auction Status] Error closing auction (Deductive Method) for group ${groupId}:`, error);
            throw error;
        }

        if (!broadcastPayload) {
            return;
        }

        // Emit to group room (for users who joined the room)
        io.to(`group:${groupId}`).emit('auction:closed', broadcastPayload);

        // Also emit to all users who are members of this group (from database)
        userIds.forEach(userId => {
            io.to(`user:${userId}`).emit('auction:closed', broadcastPayload);
        });
        
        // Also emit globally for users who might be viewing
        io.emit('auction:closed', broadcastPayload);

        console.log(`📢 [Auction Status] Notified ${userIds.length} members about auction closing for group ${groupId}`);
    }
}


