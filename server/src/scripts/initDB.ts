import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../lib/sequelize';

// Import all models to register them
import '../models/User';
import '../models/Address';
import '../models/UserVerification';
import '../models/Group';
import '../models/GroupUserShare';
import '../models/GroupAccount';
import '../models/Auction';
import '../models/Finance';
import '../models/PaymentMethod';
import '../models/CompanyAccount';
import '../models/Complaint';
import '../models/Config';
import '../models/FeatureConfig';
import '../models/GroupFeature';

// Import index to set up associations
import '../models/index';

async function initDatabase() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connection established.');

        console.log('Dropping all tables...');
        // Force sync will drop existing tables and recreate them
        await sequelize.sync({ force: true });

        console.log('✅ All tables have been created successfully!');

        console.log('\nTables created:');
        const tableNames = Object.keys(sequelize.models);
        tableNames.forEach(name => {
            console.log(`  - ${name}`);
        });

        console.log('\n💡 Tip: Run "npm run db:seed" to create admin and product owner users');
        console.log('   Or run "npm run db:seed" after initialization to seed users.');

        await sequelize.close();
        console.log('\n✅ Database initialization complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    }
}

initDatabase();

