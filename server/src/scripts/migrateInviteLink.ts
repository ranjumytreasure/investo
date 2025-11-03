import { sequelize } from '../lib/sequelize';

async function migrateInviteLink() {
    try {
        console.log('Adding invite_link column to group_usershares table...');

        // Check if column already exists
        const [results] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='group_usershares' AND column_name='invite_link'
        `);

        if ((results as any[]).length > 0) {
            console.log('✅ invite_link column already exists');
            return;
        }

        // Add invite_link column
        await sequelize.query(`
            ALTER TABLE group_usershares 
            ADD COLUMN invite_link TEXT NULL
        `);

        console.log('✅ Successfully added invite_link column to group_usershares table');
    } catch (error: any) {
        console.error('❌ Error adding invite_link column:', error.message);
        throw error;
    } finally {
        await sequelize.close();
    }
}

migrateInviteLink()
    .then(() => {
        console.log('Migration completed');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    });

