import mongoose from 'mongoose';

const certificationSchema = new mongoose.Schema({
    name: { type: String, required: false },
    issuingBody: String,
    certificateNumber: String,
    validFrom: Date,
    validUntil: Date,
    scope: String,
    documentUrl: String,
    status: { type: String, default: 'active' },
    renewalReminder: { type: Number, default: 90 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Certification', certificationSchema);
