import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../lib/sequelize';
import { QueryTypes } from 'sequelize';

async function migrateGroupFeatures() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Check if old table exists
        const [oldTableExists] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'feature_and_charges'
            );
        `, { type: QueryTypes.SELECT }) as any[];

        // Check if new table exists
        const [newTableExists] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'group_features'
            );
        `, { type: QueryTypes.SELECT }) as any[];

        if (oldTableExists?.exists && !newTableExists?.exists) {
            console.log('Migrating from feature_and_charges to group_features...');

            // Create the new table with same structure
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS group_features (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    group_id UUID NOT NULL,
                    feature_id UUID,
                    feature_name VARCHAR(255) NOT NULL,
                    charge_percent DECIMAL(5, 2) NOT NULL,
                    charge_amount DECIMAL(12, 2) NOT NULL,
                    enabled BOOLEAN NOT NULL DEFAULT true,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                );
            `);

            // Copy data from old table to new table
            await sequelize.query(`
                INSERT INTO group_features (id, group_id, feature_id, feature_name, charge_percent, charge_amount, enabled, created_at, updated_at)
                SELECT id, group_id, feature_id, feature_name, charge_percent, charge_amount, enabled, created_at, updated_at
                FROM feature_and_charges;
            `);

            console.log('✅ Data migrated successfully!');
            console.log('⚠️  Old table "feature_and_charges" still exists. You can drop it manually after verifying the migration.');
            console.log('   To drop: DROP TABLE feature_and_charges;');
        } else if (newTableExists?.exists) {
            console.log('✅ Table "group_features" already exists.');

            if (oldTableExists?.exists) {
                console.log('⚠️  Old table "feature_and_charges" still exists. Consider dropping it.');
            }
        } else {
            console.log('ℹ️  No existing table found. The table will be created when you run db:init or when the app starts.');
        }

        await sequelize.close();
        console.log('\n✅ Migration check complete!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error during migration:', error);
        if (error.message) {
            console.error('Error details:', error.message);
        }
        process.exit(1);
    }
}

migrateGroupFeatures();

