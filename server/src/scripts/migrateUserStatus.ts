import { sequelize } from '../lib/sequelize';

async function migrateUserStatus() {
    try {
        console.log('🔄 Starting user status migration...');

        // Check if 'inactive' is already in the enum
        const [results] = await sequelize.query(`
            SELECT 
                t.typname AS enum_name,
                e.enumlabel AS enum_value
            FROM pg_type t 
            JOIN pg_enum e ON t.oid = e.enumtypid  
            WHERE t.typname = 'enum_users_status'
            ORDER BY e.enumsortorder;
        `);

        const enumValues = (results as any[]).map(r => r.enum_value);
        console.log('Current enum values:', enumValues);

        if (!enumValues.includes('inactive')) {
            console.log('➕ Adding "inactive" to user status enum...');
            await sequelize.query(`ALTER TYPE enum_users_status ADD VALUE IF NOT EXISTS 'inactive'`);
            console.log('✅ Added "inactive" to enum');
        } else {
            console.log('✅ "inactive" already exists in enum');
        }

        console.log('✅ Migration completed!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateUserStatus();

