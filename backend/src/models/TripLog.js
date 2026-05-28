import mongoose from 'mongoose';

const tripLogSchema = new mongoose.Schema(
    {
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vehicle',
            required: false
        },
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee'
        },
        startOdometer: {
            type: Number,
            required: false
        },
        endOdometer: {
            type: Number
        },
        startDate: {
            type: Date,
            default: Date.now
        },
        endDate: {
            type: Date
        },
        origin: {
            type: String,
            required: false
        },
        destination: {
            type: String,
            required: false
        },
        purpose: {
            type: String,
            type: String,
            default: 'delivery'
        },
        fuelConsumed: {
            type: Number // in liters
        },
        fuelCost: {
            type: Number
        },
        status: {
            type: String,
            type: String,
            default: 'active'
        },
        notes: String,
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        deletedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

const TripLog = mongoose.model('TripLog', tripLogSchema);
export default TripLog;
