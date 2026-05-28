import mongoose from 'mongoose';

const qcResultSchema = new mongoose.Schema({
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionBatch', required: false },
    checkpoint: { type: mongoose.Schema.Types.ObjectId, ref: 'QCCheckpoint', required: false },
    sampleId: String,
    parameterResults: [{
        parameterName: String,
        value: Number,
        withinSpec: Boolean,
    }],
    overallResult: { type: String, default: 'pending' },
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    inspectedAt: Date,
    labReportUrl: String,
    notes: String,
    correctiveAction: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

qcResultSchema.index({ batch: 1, checkpoint: 1 });

export default mongoose.model('QCResult', qcResultSchema);
