import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../lib/sequelize';
import { QueryTypes } from 'sequelize';

async function migrateNextAuctionDate() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Check if first_auction_date column exists
        const firstAuctionDateCheck: any[] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='groups' AND column_name='first_auction_date';
        `, { type: QueryTypes.SELECT }) as any[];

        // Check if next_auction_date column already exists
        const nextAuctionDateCheck: any[] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='groups' AND column_name='next_auction_date';
        `, { type: QueryTypes.SELECT }) as any[];

        if (nextAuctionDateCheck && nextAuctionDateCheck.length > 0) {
            console.log('✅ next_auction_date column already exists in groups table.');
            
            // If both exist, we might need to migrate data
            if (firstAuctionDateCheck && firstAuctionDateCheck.length > 0) {
                console.log('⚠️  Both first_auction_date and next_auction_date exist. Checking if migration needed...');
                // Copy data from first_auction_date to next_auction_date if next_auction_date is null
                await sequelize.query(`
                    UPDATE groups 
                    SET next_auction_date = first_auction_date 
                    WHERE next_auction_date IS NULL AND first_auction_date IS NOT NULL;
                `);
                console.log('✅ Migrated data from first_auction_date to next_auction_date where needed.');
                
                // Drop first_auction_date column
                console.log('Dropping first_auction_date column...');
                await sequelize.query(`
                    ALTER TABLE groups 
                    DROP COLUMN IF EXISTS first_auction_date;
                `);
                console.log('✅ Dropped first_auction_date column.');
            }
        } else if (firstAuctionDateCheck && firstAuctionDateCheck.length > 0) {
            // Rename first_auction_date to next_auction_date
            console.log('Renaming first_auction_date to next_auction_date...');
            await sequelize.query(`
                ALTER TABLE groups 
                RENAME COLUMN first_auction_date TO next_auction_date;
            `);
            console.log('✅ Column renamed successfully!');
        } else {
            console.log('⚠️  first_auction_date column does not exist. Creating next_auction_date column...');
            await sequelize.query(`
                ALTER TABLE groups 
                ADD COLUMN next_auction_date DATE;
            `);
            console.log('✅ next_auction_date column created successfully!');
        }

        await sequelize.close();
        console.log('\n✅ Migration complete!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error renaming column:', error);
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

migrateNextAuctionDate();




