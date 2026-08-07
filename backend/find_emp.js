import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './src/models/Employee.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB');

        const employees = await Employee.find({}).setOptions({ includeDeleted: true });
        console.log(`Total employees in DB: ${employees.length}`);
        employees.forEach(emp => {
            console.log(`ID: ${emp._id} | Code: ${emp.employeeCode} | Name: ${emp.firstName} ${emp.lastName} | Status: ${emp.status} | DeletedAt: ${emp.deletedAt}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

run();

