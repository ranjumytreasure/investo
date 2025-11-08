import dotenv from 'dotenv';
dotenv.config();
import { sequelize } from '../lib/sequelize';
import { QueryTypes } from 'sequelize';

async function addPaymentColumns() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Check if columns already exist
        const results: any[] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'payments' 
            AND column_name IN ('payment_method_id', 'status', 'transaction_id', 'failure_reason', 'processed_at')
        `, { type: QueryTypes.SELECT }) as any[];

        const existingColumns = results && results.length > 0 ? results.map((r: any) => r.column_name) : [];

        // Add payment_method_id column
        if (!existingColumns.includes('payment_method_id')) {
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL
            `);
            console.log('✅ Added payment_method_id column');
        } else {
            console.log('⏭️  payment_method_id column already exists');
        }

        // Add status column
        if (!existingColumns.includes('status')) {
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending'
            `);
            console.log('✅ Added status column');
        } else {
            console.log('⏭️  status column already exists');
        }

        // Add transaction_id column
        if (!existingColumns.includes('transaction_id')) {
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN transaction_id VARCHAR(255)
            `);
            console.log('✅ Added transaction_id column');
        } else {
            console.log('⏭️  transaction_id column already exists');
        }

        // Add failure_reason column
        if (!existingColumns.includes('failure_reason')) {
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN failure_reason TEXT
            `);
            console.log('✅ Added failure_reason column');
        } else {
            console.log('⏭️  failure_reason column already exists');
        }

        // Add processed_at column
        if (!existingColumns.includes('processed_at')) {
            await sequelize.query(`
                ALTER TABLE payments 
                ADD COLUMN processed_at TIMESTAMP
            `);
            console.log('✅ Added processed_at column');
        } else {
            console.log('⏭️  processed_at column already exists');
        }

        // Update existing payments to have 'completed' status if they don't have one
        await sequelize.query(`
            UPDATE payments 
            SET status = 'completed' 
            WHERE status IS NULL OR status = ''
        `);
        console.log('✅ Updated existing payments with default status');

        console.log('✅ Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

addPaymentColumns();

