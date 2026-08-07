import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './src/models/Employee.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to DB');

        const empId = '6a72e1ca07ec8cb6ebcfe8dd';
        const emp = await Employee.findById(empId).setOptions({ includeDeleted: true });

        if (!emp) {
            console.log('Employee EMP-1 not found!');
            return;
        }

        console.log(`Found Employee: ${emp.employeeCode} - ${emp.firstName} ${emp.lastName}`);

        // Delete permanently from Employee collection
        const result = await Employee.deleteOne({ _id: emp._id });
        console.log(`Deleted employee record: ${result.deletedCount} document(s) removed.`);

        // Clean up temporary script
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

run();
