import dotenv from 'dotenv';
dotenv.config();
import { sequelize } from '../lib/sequelize';
import { QueryTypes } from 'sequelize';

async function migrateCanInvite() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Check if column exists
        const [results]: any[] = await sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='group_usershares' AND column_name='can_invite';
        `, { type: QueryTypes.SELECT });

        if (results && results.length > 0) {
            console.log('✅ can_invite column already exists in group_usershares table.');
            await sequelize.close();
            process.exit(0);
        }

        console.log('Adding can_invite column to group_usershares table...');
        await sequelize.query(`
            ALTER TABLE group_usershares
            ADD COLUMN can_invite BOOLEAN NOT NULL DEFAULT false;
        `);

        console.log('✅ can_invite column added successfully!');

        await sequelize.close();
        console.log('\n✅ Migration complete!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error adding can_invite column:', error);
        if (error.message) {
            console.error('Error details:', error.message);
        }
        process.exit(1);
    }
}

migrateCanInvite();

