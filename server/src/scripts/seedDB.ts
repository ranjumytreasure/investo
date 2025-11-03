import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../lib/sequelize';
import { User } from '../models/User';
import bcrypt from 'bcrypt';

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

async function seedDatabase() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Database connection established.');

        // Seed Admin User
        const adminPhone = '9942393231';
        const adminPin = '1234';
        const hashedAdminPin = await bcrypt.hash(adminPin, 10);

        const [adminUser, adminCreated] = await User.findOrCreate({
            where: { phone: adminPhone },
            defaults: {
                phone: adminPhone,
                pin: hashedAdminPin,
                pin_set: true,
                role: 'admin',
                name: 'Admin User',
                status: 'active',
                kyc_verified: false
            }
        });

        if (adminCreated) {
            console.log('✅ Admin user created:', adminPhone);
        } else {
            // Update existing admin user
            adminUser.pin = hashedAdminPin;
            adminUser.pin_set = true;
            adminUser.role = 'admin';
            adminUser.status = 'active';
            await adminUser.save();
            console.log('✅ Admin user updated:', adminPhone);
        }

        // Seed Product Owner User
        const poPhone = '9942393232';
        const poPin = '1234';
        const hashedPoPin = await bcrypt.hash(poPin, 10);

        const [poUser, poCreated] = await User.findOrCreate({
            where: { phone: poPhone },
            defaults: {
                phone: poPhone,
                pin: hashedPoPin,
                pin_set: true,
                role: 'productowner',
                name: 'Product Owner',
                status: 'active',
                kyc_verified: false
            }
        });

        if (poCreated) {
            console.log('✅ Product Owner user created:', poPhone);
        } else {
            // Update existing product owner user
            poUser.pin = hashedPoPin;
            poUser.pin_set = true;
            poUser.role = 'productowner';
            poUser.status = 'active';
            await poUser.save();
            console.log('✅ Product Owner user updated:', poPhone);
        }

        console.log('\n📋 Seed Summary:');
        console.log('  Admin User:');
        console.log(`    Phone: ${adminPhone}`);
        console.log(`    PIN: ${adminPin}`);
        console.log(`    Role: admin`);
        console.log('  Product Owner User:');
        console.log(`    Phone: ${poPhone}`);
        console.log(`    PIN: ${poPin}`);
        console.log(`    Role: productowner`);

        await sequelize.close();
        console.log('\n✅ Database seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();

