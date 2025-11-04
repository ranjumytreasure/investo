import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../lib/sequelize';
import { QueryTypes } from 'sequelize';

async function addAuctionColumns() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Check if group_usershare_id column exists
        const groupUsershareCheck: any[] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='auctions' AND column_name='group_usershare_id';
        `, { type: QueryTypes.SELECT }) as any[];

        if (groupUsershareCheck && groupUsershareCheck.length > 0) {
            console.log('✅ group_usershare_id column already exists in auctions table.');
        } else {
            console.log('Adding group_usershare_id column to auctions table...');
            await sequelize.query(`
                ALTER TABLE auctions 
                ADD COLUMN group_usershare_id UUID;
            `);
            console.log('✅ group_usershare_id column added successfully!');
        }

        // Check if is_winning_bid column exists
        const isWinningBidCheck: any[] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='auctions' AND column_name='is_winning_bid';
        `, { type: QueryTypes.SELECT }) as any[];

        if (isWinningBidCheck && isWinningBidCheck.length > 0) {
            console.log('✅ is_winning_bid column already exists in auctions table.');
        } else {
            console.log('Adding is_winning_bid column to auctions table...');
            await sequelize.query(`
                ALTER TABLE auctions 
                ADD COLUMN is_winning_bid BOOLEAN NOT NULL DEFAULT false;
            `);
            console.log('✅ is_winning_bid column added successfully!');
        }

        await sequelize.close();
        console.log('\n✅ Migration complete!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error adding columns:', error);
        if (error.message) {
            console.error('Error details:', error.message);
        }
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        await sequelize.close();
        process.exit(1);
    }
}

addAuctionColumns();

