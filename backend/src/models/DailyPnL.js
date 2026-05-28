import mongoose from 'mongoose';

const dailyPnLSchema = new mongoose.Schema({
  date: { type: Date, required: false },
  day: { type: Number },
  // Expense categories from Excel (March 2026 BE DHY)
  rawMaterial: { type: Number, default: 0 },
  labourSalary: { type: Number, default: 0 },
  supervisorQC: { type: Number, default: 0 },
  electricity: { type: Number, default: 0 },
  firewood: { type: Number, default: 0 },
  packing: { type: Number, default: 0 },
  transport: { type: Number, default: 0 },
  communication: { type: Number, default: 0 },
  other: { type: Number, default: 0 },
  totalExpenses: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  netProfit: { type: Number, default: 0 },
  notes: { type: String },
  deletedAt: { type: Date, default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const DailyPnL = mongoose.model('DailyPnL', dailyPnLSchema);
export default DailyPnL;
