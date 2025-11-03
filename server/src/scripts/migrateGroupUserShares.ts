import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../lib/sequelize';
import { QueryTypes } from 'sequelize';

async function migrateGroupUserShares() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Check existing columns
        const columns: any[] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='group_usershares'
            ORDER BY column_name;
        `, { type: QueryTypes.SELECT }) as any[];

        const columnNames = columns.map(c => c.column_name);
        console.log('Existing columns:', columnNames.join(', '));

        // Add phone column if not exists
        if (!columnNames.includes('phone')) {
            console.log('Adding phone column...');
            await sequelize.query(`
                ALTER TABLE group_usershares 
                ADD COLUMN phone VARCHAR(255);
            `);
            console.log('✅ Added phone column');
        }

        // Make user_id nullable if not already
        if (columnNames.includes('user_id')) {
            console.log('Making user_id nullable...');
            await sequelize.query(`
                ALTER TABLE group_usershares 
                ALTER COLUMN user_id DROP NOT NULL;
            `);
            console.log('✅ Made user_id nullable');
        }

        // Add invited_by column if not exists
        if (!columnNames.includes('invited_by')) {
            console.log('Adding invited_by column...');
            await sequelize.query(`
                ALTER TABLE group_usershares 
                ADD COLUMN invited_by UUID;
            `);
            console.log('✅ Added invited_by column');
        }

        // Add invite_otp column if not exists
        if (!columnNames.includes('invite_otp')) {
            console.log('Adding invite_otp column...');
            await sequelize.query(`
                ALTER TABLE group_usershares 
                ADD COLUMN invite_otp VARCHAR(10);
            `);
            console.log('✅ Added invite_otp column');
        }

        // Add invite_otp_expires_at column if not exists
        if (!columnNames.includes('invite_otp_expires_at')) {
            console.log('Adding invite_otp_expires_at column...');
            await sequelize.query(`
                ALTER TABLE group_usershares 
                ADD COLUMN invite_otp_expires_at TIMESTAMP;
            `);
            console.log('✅ Added invite_otp_expires_at column');
        }

        // Add created_at and updated_at if not exists
        if (!columnNames.includes('created_at')) {
            console.log('Adding created_at column...');
            await sequelize.query(`
                ALTER TABLE group_usershares 
                ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
            `);
            console.log('✅ Added created_at column');
        }

        if (!columnNames.includes('updated_at')) {
            console.log('Adding updated_at column...');
            await sequelize.query(`
                ALTER TABLE group_usershares 
                ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
            `);
            console.log('✅ Added updated_at column');
        }

        // Update status default to 'pending' for existing records if needed
        console.log('Migration complete!');
        await sequelize.close();
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error during migration:', error);
        if (error.message) {
            console.error('Error details:', error.message);
        }
        process.exit(1);
    }
}

migrateGroupUserShares();

