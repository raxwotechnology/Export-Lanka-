import mongoose from 'mongoose';

const productionBatchSchema = new mongoose.Schema({
  sn: { type: Number },
  date: { type: Date },
  batchNo: { type: String },
  product: { type: String },
  staff_day: { type: Number, default: 0 },
  staff_night: { type: Number, default: 0 },
  staff_total: { type: Number, default: 0 },
  otherStaff_day: { type: Number, default: 0 },
  otherStaff_night: { type: Number, default: 0 },
  otherStaff_total: { type: Number, default: 0 },
  inputWeight_day: { type: Number, default: 0 },
  inputWeight_night: { type: Number, default: 0 },
  inputWeight_total: { type: Number, default: 0 },
  rejects_day: { type: Number, default: 0 },
  rejects_night: { type: Number, default: 0 },
  weightBeforeDrying_day: { type: Number, default: 0 },
  weightBeforeDrying_night: { type: Number, default: 0 },
  outputWeight_day: { type: Number, default: 0 },
  outputWeight_night: { type: Number, default: 0 },
  outputWeight_total: { type: Number, default: 0 },
  powder: { type: String },
  teaBag: { type: String },
  remark: { type: String },
  machineAssignments: [{
    machineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine' },
    startTime: Date,
    endTime: Date,
    notes: String
  }],
  status: { type: String, default: 'completed' },
  deletedAt: { type: Date, default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const ProductionBatch = mongoose.model('ProductionBatch', productionBatchSchema);
export default ProductionBatch;
