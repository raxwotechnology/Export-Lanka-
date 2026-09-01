import mongoose from 'mongoose';

const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        console.error('❌ MongoDB Connection Error: MONGO_URI is not defined in environment variables.');
        console.error('👉 Please configure MONGO_URI in your Render Environment Variables dashboard.');
        return null;
    }

    try {
        const conn = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
        
        try {
            await mongoose.connection.db.collection('products').dropIndex('sku_1');
            console.log('✓ Successfully dropped old non-sparse sku_1 index');
        } catch (e) {
            // Index doesn't exist or already dropped
        }

        return conn;
    } catch (error) {
        console.error(`✗ MongoDB Connection Error: ${error.message}`);
        console.error('👉 Ensure that your MongoDB Atlas cluster Network Access allows 0.0.0.0/0 (Anywhere).');
        return null;
    }
};

export default connectDB;