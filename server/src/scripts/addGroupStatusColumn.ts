import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../lib/sequelize';
import { QueryTypes } from 'sequelize';

async function addGroupStatusColumn() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Check if status column exists
        const results: any[] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='groups' AND column_name='status';
        `, { type: QueryTypes.SELECT }) as any[];

        if (results && results.length > 0) {
            console.log('✅ Status column already exists in groups table.');
            await sequelize.close();
            process.exit(0);
        }

        console.log('Adding status column to groups table...');

        // Add status column with default value
        await sequelize.query(`
            DO $$ 
            BEGIN
                -- Check if enum type exists, if not create it
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_groups_status') THEN
                    CREATE TYPE enum_groups_status AS ENUM ('new', 'inprogress', 'closed');
                END IF;
            END $$;
        `);

        await sequelize.query(`
            ALTER TABLE groups 
            ADD COLUMN IF NOT EXISTS status enum_groups_status NOT NULL DEFAULT 'new';
        `);

        console.log('✅ Status column added successfully!');
        console.log('💡 All existing groups have been set to status="new" by default.');

        await sequelize.close();
        console.log('\n✅ Migration complete!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error adding status column:', error);
        if (error.message) {
            console.error('Error details:', error.message);
        }
        process.exit(1);
    }
}

addGroupStatusColumn();

