import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../lib/sequelize';
import { FeatureConfig } from '../models/FeatureConfig';

async function createDefaultFeatures() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Check if features already exist
        const existingCount = await FeatureConfig.count();
        if (existingCount > 0) {
            console.log(`Found ${existingCount} existing features. Skipping default creation.`);
            await sequelize.close();
            process.exit(0);
        }

        console.log('Creating default features...');

        const defaultFeatures = [
            {
                name: 'Standard Features',
                description: 'Basic auction, notifications, and group management',
                charge_percent: 5,
                is_active: true
            },
            {
                name: 'Advanced Analytics',
                description: 'Detailed reports and insights for group performance',
                charge_percent: 2,
                is_active: true
            },
            {
                name: 'Priority Support',
                description: '24/7 dedicated support for your group',
                charge_percent: 1.5,
                is_active: true
            },
            {
                name: 'Custom Integrations',
                description: 'API access and webhooks for custom integrations',
                charge_percent: 3,
                is_active: true
            },
            {
                name: 'Multi-Currency',
                description: 'Support for multiple currencies in your group',
                charge_percent: 2.5,
                is_active: true
            }
        ];

        await FeatureConfig.bulkCreate(defaultFeatures);

        console.log(`✅ Created ${defaultFeatures.length} default features!`);

        const createdFeatures = await FeatureConfig.findAll();
        console.log('\nCreated features:');
        createdFeatures.forEach(f => {
            console.log(`  - ${f.name} (${f.charge_percent}%)`);
        });

        await sequelize.close();
        console.log('\n✅ Default features creation complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating default features:', error);
        process.exit(1);
    }
}

createDefaultFeatures();

