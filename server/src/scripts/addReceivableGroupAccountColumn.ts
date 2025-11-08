import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../lib/sequelize';
import { QueryTypes } from 'sequelize';

async function addReceivableGroupAccountColumn() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connection established.');

        const existingColumns: Array<{ column_name: string }> = await sequelize.query(
            `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'receivables'
              AND column_name = 'group_account_id';
            `,
            { type: QueryTypes.SELECT }
        ) as any;

        if (existingColumns.length > 0) {
            console.log('ℹ️ Column group_account_id already exists on receivables table. No changes made.');
            await sequelize.close();
            process.exit(0);
        }

        console.log('🔄 Adding group_account_id column to receivables table...');
        await sequelize.query(`
            ALTER TABLE receivables
            ADD COLUMN group_account_id UUID NULL;
        `);

        console.log('✅ Column group_account_id added successfully.');
        await sequelize.close();
        console.log('✅ Migration complete!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error adding group_account_id column to receivables:', error);
        process.exit(1);
    }
}

addReceivableGroupAccountColumn();


