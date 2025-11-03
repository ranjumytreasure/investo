import cron from 'node-cron';
import { Group } from '../models/Group';
import { Server as SocketIOServer } from 'socket.io';

export function startAuctionCron(io: SocketIOServer) {
    // Runs every minute to check upcoming auctions
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        const groups = await Group.findAll();
        for (const g of groups) {
            if (g.auction_start_at && g.auction_start_at <= now) {
                io.emit('auction:opened', { group_id: g.id });
            }
            if (g.auction_end_at && g.auction_end_at <= now) {
                io.emit('auction:closed', { group_id: g.id });
            }
        }
    });
}




