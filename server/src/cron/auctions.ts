import cron from 'node-cron';
import { Op } from 'sequelize';
import { Group } from '../models/Group';
import { GroupAccount } from '../models/GroupAccount';
import { Server as SocketIOServer } from 'socket.io';
import { openAuction, closeAuction } from '../services/auctionService';

export function startAuctionCron(io: SocketIOServer) {
    // Runs every minute to check upcoming auctions
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            
            // Find groups that should have auctions opened
            // Only open if: start time has passed AND end time has NOT passed yet
            const groupsToOpen = await Group.findAll({
                where: {
                    auction_start_at: {
                        [Op.lte]: now
                    },
                    auction_end_at: {
                        [Op.gte]: now // End time must be in the future
                    },
                    status: { [Op.in]: ['new', 'inprogress'] }
                }
            });

            for (const group of groupsToOpen) {
                // Check if auction is already open
                const existingAccount = await GroupAccount.findOne({
                    where: {
                        group_id: group.id,
                        status: 'open'
                    }
                });

                if (!existingAccount) {
                    console.log(`⏰ Opening auction for group: ${group.id} (${group.name})`);
                    await openAuction(group.id, io);
                }
            }

            // Find open auctions that should be closed
            const openAccounts = await GroupAccount.findAll({
                where: {
                    status: 'open'
                },
                include: [{
                    model: Group,
                    as: 'group',
                    where: {
                        auction_end_at: {
                            [Op.lte]: now
                        }
                    },
                    required: true
                }]
            });

            for (const account of openAccounts) {
                console.log(`⏰ Closing auction for group: ${account.group_id}`);
                await closeAuction(account.group_id, io);
            }
        } catch (error) {
            console.error('❌ Error in auction cron job:', error);
        }
    });

    console.log('✅ Auction cron job started (runs every minute)');
}




