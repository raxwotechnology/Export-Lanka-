import mongoose from 'mongoose';

const pettyCashSchema = new mongoose.Schema({
  date: { type: Date, required: false, default: Date.now },
  refNo: { type: String },
  item: { type: String, required: false },
  supplier: { type: String },
  amount: { type: Number, default: 0 },
  category: { type: String },
  rawMaterial_nos: { type: Number, default: 0 },
  rawMaterial_rate: { type: Number, default: 0 },
  rawMaterial_cost: { type: Number, default: 0 },
  chemicals: { type: Number, default: 0 },
  transport: { type: Number, default: 0 },
  welfare: { type: Number, default: 0 },
  fuel: { type: Number, default: 0 },
  maintenance: { type: Number, default: 0 },
  stationary: { type: Number, default: 0 },
  miscWages: { type: Number, default: 0 },
  wood: { type: Number, default: 0 },
  packingMaterials: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, default: 'approved' },
  deletedAt: { type: Date, default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const PettyCash = mongoose.model('PettyCash', pettyCashSchema);
export default PettyCash;
