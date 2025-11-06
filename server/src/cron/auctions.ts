import cron from 'node-cron';
import { Op } from 'sequelize';
import { Group } from '../models/Group';
import { GroupAccount } from '../models/GroupAccount';
import { GroupUserShare } from '../models/GroupUserShare';
import { Server as SocketIOServer } from 'socket.io';
import { openAuction, closeAuction } from '../services/auctionService';

/**
 * Combine next_auction_date (date) with auction_start_at (time) to get full datetime
 */
function combineAuctionDateTime(nextAuctionDate: Date | null, auctionStartAt: Date | null): Date | null {
    if (!nextAuctionDate || !auctionStartAt) {
        return null;
    }

    // Extract date from next_auction_date
    const date = new Date(nextAuctionDate);
    date.setHours(0, 0, 0, 0);

    // Extract time from auction_start_at
    const time = new Date(auctionStartAt);
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();
    const milliseconds = time.getMilliseconds();

    // Combine date and time
    date.setHours(hours, minutes, seconds, milliseconds);
    return date;
}

export function startAuctionCron(io: SocketIOServer) {
    // Track which auctions have been warned (to avoid duplicate warnings)
    const warnedAuctions = new Set<string>();

    // Runs every minute to open and close auctions based on scheduled times
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const nowMs = now.getTime();
            
            console.log(`⏰ [Auction Status] Running auction cron job at ${now.toISOString()}`);

            // STEP 1: Open auctions when next_auction_date + auction_start_at is reached
            // Find all groups with 'inprogress' status that have next_auction_date and auction_start_at
            const groupsToCheck = await Group.findAll({
                where: {
                    status: 'inprogress',
                    next_auction_date: { [Op.ne]: null },
                    auction_start_at: { [Op.ne]: null }
                }
            });

            console.log(`⏰ [Auction Status] Checking ${groupsToCheck.length} groups for auction opening...`);

            for (const group of groupsToCheck) {
                // Combine next_auction_date (date) with auction_start_at (time) to get full datetime
                const auctionStartTime = combineAuctionDateTime(group.next_auction_date, group.auction_start_at);
                
                if (!auctionStartTime) {
                    continue;
                }

                // Check if auction start time has been reached
                if (now >= auctionStartTime) {
                    // Check if auction is already open for this group
                    const existingAccount = await GroupAccount.findOne({
                        where: {
                            group_id: group.id,
                            status: 'open'
                        }
                    });

                    // Only open if auction is not already open
                    if (!existingAccount) {
                        console.log(`⏰ [Auction Status] Opening auction for group: ${group.id} (${group.name}) - Start time reached: ${auctionStartTime.toISOString()}`);
                        await openAuction(group.id, io);
                        console.log(`✅ [Auction Status] Auction opened for group ${group.id} at ${now.toISOString()}`);
                    }
                } else {
                    const timeUntilStart = Math.round((auctionStartTime.getTime() - nowMs) / 1000);
                    console.log(`⏰ [Auction Status] Group ${group.id} (${group.name}) - Auction starts in ${timeUntilStart}s (${auctionStartTime.toISOString()})`);
                }
            }

            // STEP 2: Close auctions when auction_end_at is reached
            // Find all open auctions
            const openAccounts = await GroupAccount.findAll({
                where: {
                    status: 'open'
                },
                include: [{
                    model: Group,
                    as: 'group',
                    required: true
                }]
            });

            console.log(`⏰ [Auction Status] Checking ${openAccounts.length} open auctions for closing...`);

            for (const account of openAccounts) {
                const group = (account as any).group as Group;
                
                if (!group.auction_end_at) {
                    console.log(`⚠️ [Auction Status] Group ${group.id} has open auction but no auction_end_at set`);
                    continue;
                }

                const endTime = new Date(group.auction_end_at);
                const fiveMinutesBefore = new Date(endTime.getTime() - 5 * 60 * 1000);

                // Send 5-minute warning
                if (now >= fiveMinutesBefore && now < endTime && !warnedAuctions.has(account.id)) {
                    console.log(`⚠️ [Auction Status] Sending 5-minute warning for auction: ${account.id} (Group: ${group.id})`);
                    
                    // Get all active group members (users with accepted/active shares) from database
                    const shares = await GroupUserShare.findAll({
                        where: {
                            group_id: group.id,
                            status: { [Op.in]: ['accepted', 'active'] },
                            user_id: { [Op.ne]: null }
                        }
                    });

                    // Get unique user IDs for notifications (deduplicate in case user has multiple shares)
                    const userIds = Array.from(new Set(
                        shares
                            .map(share => share.user_id)
                            .filter((id): id is string => id !== null)
                    ));
                    
                    const warningData = {
                        group_id: group.id,
                        group_name: group.name,
                        group_account_id: account.id,
                        message: 'Auction ending in 5 minutes',
                        time_left_minutes: 5,
                        auction_end_at: endTime.toISOString()
                    };

                    // Emit to group room (for users who joined the room)
                    io.to(`group:${group.id}`).emit('auction:warning', warningData);

                    // Also emit to all users who are members of this group (from database)
                    userIds.forEach(userId => {
                        io.to(`user:${userId}`).emit('auction:warning', warningData);
                    });

                    // Also emit globally for users who might be viewing
                    io.emit('auction:warning', warningData);
                    
                    console.log(`📢 [Auction Status] Sent 5-minute warning to ${userIds.length} members for group ${group.id}`);
                    warnedAuctions.add(account.id);
                }

                // Close auction if end time reached
                if (now >= endTime) {
                    console.log(`⏰ [Auction Status] Closing auction for group: ${group.id} (${group.name}) - End time reached: ${endTime.toISOString()}`);
                    await closeAuction(group.id, io);
                    
                    // Remove from warned set after closing
                    warnedAuctions.delete(account.id);
                    console.log(`✅ [Auction Status] Auction closed for group ${group.id} at ${now.toISOString()}`);
                } else {
                    const timeUntilEnd = Math.round((endTime.getTime() - nowMs) / 1000);
                    console.log(`⏰ [Auction Status] Group ${group.id} (${group.name}) - Auction ends in ${timeUntilEnd}s (${endTime.toISOString()})`);
                }
            }

            // Clean up old entries from warnedAuctions set (for closed auctions)
            const closedAccountIds = await GroupAccount.findAll({
                where: {
                    status: { [Op.in]: ['closed', 'completed'] }
                },
                attributes: ['id']
            });

            closedAccountIds.forEach(acc => {
                warnedAuctions.delete(acc.id);
            });

        } catch (error) {
            console.error('❌ [Auction Status] Error in auction cron job:', error);
        }
    });

    console.log('✅ [Auction Status] Auction cron job started (runs every minute)');
}




