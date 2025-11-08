import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../lib/sequelize';
import { QueryTypes } from 'sequelize';

async function renameReceivableColumn() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connection established.');

        const columns: Array<{ column_name: string }> = await sequelize.query(
            `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'receivables'
              AND column_name IN ('expected_amount', 'due_amount');
            `,
            { type: QueryTypes.SELECT }
        ) as any;

        const hasDueAmount = columns.some(col => col.column_name === 'due_amount');
        const hasExpectedAmount = columns.some(col => col.column_name === 'expected_amount');

        if (hasDueAmount && !hasExpectedAmount) {
            console.log('ℹ️ Column already renamed to due_amount. No action needed.');
            await sequelize.close();
            process.exit(0);
        }

        if (!hasExpectedAmount) {
            console.log('⚠️ Column expected_amount not found on receivables table. Nothing to rename.');
            await sequelize.close();
            process.exit(0);
        }

        console.log('🔄 Renaming receivables.expected_amount to due_amount...');
        await sequelize.query(`ALTER TABLE receivables RENAME COLUMN expected_amount TO due_amount;`);
        console.log('✅ Column renamed successfully.');

        await sequelize.close();
        console.log('✅ Migration complete!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error renaming column expected_amount → due_amount:', error);
        process.exit(1);
    }
}

renameReceivableColumn();


