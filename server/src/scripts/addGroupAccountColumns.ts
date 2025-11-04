import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../lib/sequelize';
import { QueryTypes } from 'sequelize';

async function addGroupAccountColumns() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Check and create ENUM type for status
        console.log('Creating status enum type if it doesn\'t exist...');
        await sequelize.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_group_accounts_status') THEN
                    CREATE TYPE enum_group_accounts_status AS ENUM ('open', 'closed', 'completed');
                END IF;
            END $$;
        `);

        // Check if status column exists
        const statusCheck: any[] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='group_accounts' AND column_name='status';
        `, { type: QueryTypes.SELECT }) as any[];

        if (statusCheck && statusCheck.length > 0) {
            console.log('✅ Status column already exists in group_accounts table.');
        } else {
            console.log('Adding status column to group_accounts table...');
            await sequelize.query(`
                ALTER TABLE group_accounts 
                ADD COLUMN status enum_group_accounts_status NOT NULL DEFAULT 'open';
            `);
            console.log('✅ Status column added successfully!');
        }

        // Check if winner_share_id column exists
        const winnerCheck: any[] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='group_accounts' AND column_name='winner_share_id';
        `, { type: QueryTypes.SELECT }) as any[];

        if (winnerCheck && winnerCheck.length > 0) {
            console.log('✅ winner_share_id column already exists in group_accounts table.');
        } else {
            console.log('Adding winner_share_id column to group_accounts table...');
            await sequelize.query(`
                ALTER TABLE group_accounts 
                ADD COLUMN winner_share_id UUID;
            `);
            console.log('✅ winner_share_id column added successfully!');
        }

        // Check if created_at column exists
        const createdCheck: any[] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='group_accounts' AND column_name='created_at';
        `, { type: QueryTypes.SELECT }) as any[];

        if (createdCheck && createdCheck.length > 0) {
            console.log('✅ created_at column already exists in group_accounts table.');
        } else {
            console.log('Adding created_at column to group_accounts table...');
            await sequelize.query(`
                ALTER TABLE group_accounts 
                ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
            `);
            console.log('✅ created_at column added successfully!');
        }

        // Check if updated_at column exists
        const updatedCheck: any[] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='group_accounts' AND column_name='updated_at';
        `, { type: QueryTypes.SELECT }) as any[];

        if (updatedCheck && updatedCheck.length > 0) {
            console.log('✅ updated_at column already exists in group_accounts table.');
        } else {
            console.log('Adding updated_at column to group_accounts table...');
            await sequelize.query(`
                ALTER TABLE group_accounts 
                ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
            `);
            console.log('✅ updated_at column added successfully!');
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

addGroupAccountColumns();

