import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const usersToCreate = [
    {
        firstName: 'Director',
        lastName: 'Admin',
        email: 'admin@lankaexports.com',
        password: 'AdminALE@123!',
        role: 'admin',
        title: 'Director'
    },
    {
        firstName: 'HR',
        lastName: 'Manager',
        email: 'hr@lankaexports.com',
        password: 'HrALE@123!',
        role: 'hr_manager',
        title: 'HR Manager'
    },
    {
        firstName: 'Factory',
        lastName: 'Manager',
        email: 'factorymanager@lankaexports.com',
        password: 'FactorymanagerALE@123!',
        role: 'manager',
        title: 'Factory Manager'
    },
    {
        firstName: 'Sales',
        lastName: 'Manager',
        email: 'sales@lankaexports.com',
        password: 'SalesmanagerALE@123!',
        role: 'sales_manager',
        title: 'Sales Manager'
    },
    {
        firstName: 'Finance',
        lastName: 'Manager',
        email: 'finance@lankaexports.com',
        password: 'FinancemanagerALE@123!',
        role: 'accountant',
        title: 'Finance Manager'
    }
];

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to Database for User Creation\n');

        const User = (await import('./src/models/User.js')).default;

        for (const u of usersToCreate) {
            let existingUser = await User.findOne({ email: u.email });
            if (existingUser) {
                existingUser.firstName = u.firstName;
                existingUser.lastName = u.lastName;
                existingUser.password = u.password;
                existingUser.role = u.role;
                existingUser.isActive = true;
                await existingUser.save();
                console.log(`✓ Updated existing user: ${u.email} (${u.title} - Role: ${u.role})`);
            } else {
                await User.create({
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                    password: u.password,
                    role: u.role,
                    isActive: true
                });
                console.log(`✓ Created new user: ${u.email} (${u.title} - Role: ${u.role})`);
            }
        }

        console.log('\n--- Current Active Users in Database ---');
        const allUsers = await User.find({});
        allUsers.forEach(usr => console.log(`- ID: ${usr._id} | Email: ${usr.email} | Role: ${usr.role}`));

        console.log('\n🎉 ALL REQUESTED LOGINS CREATED SUCCESSFULLY!');
    } catch (err) {
        console.error('❌ Failed to create users:', err);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

run();
