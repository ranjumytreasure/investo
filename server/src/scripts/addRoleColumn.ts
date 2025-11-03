import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../lib/sequelize';
import { QueryTypes } from 'sequelize';

async function addRoleColumn() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Check if role column exists
        const results: any[] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='role';
        `, { type: QueryTypes.SELECT }) as any[];

        if (results && results.length > 0) {
            console.log('✅ Role column already exists in users table.');
            await sequelize.close();
            process.exit(0);
        }

        console.log('Adding role column to users table...');

        // Add role column with default value
        await sequelize.query(`
            DO $$ 
            BEGIN
                -- Check if enum type exists, if not create it
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_role') THEN
                    CREATE TYPE enum_users_role AS ENUM ('user', 'admin', 'productowner');
                END IF;
            END $$;
        `);

        await sequelize.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS role enum_users_role NOT NULL DEFAULT 'user';
        `);

        console.log('✅ Role column added successfully!');
        console.log('💡 All existing users have been set to role="user" by default.');
        console.log('   Run "npm run db:seed" to create admin and product owner users.');

        await sequelize.close();
        console.log('\n✅ Migration complete!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error adding role column:', error);
        if (error.message) {
            console.error('Error details:', error.message);
        }
        process.exit(1);
    }
}

addRoleColumn();

