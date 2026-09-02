import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
    name: { type: String, required: false, trim: true, unique: true },
    code: { type: String, trim: true, uppercase: true },
    startTime: { type: String, required: false }, // "08:00"
    endTime: { type: String, required: false }, // "17:00"
    breakMinutes: { type: Number, default: 60 },
    workingMinutes: Number, // auto-calculated
    graceMinutes: { type: Number, default: 15 }, // late allowance
    isOvernight: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

shiftSchema.pre('save', function () {
    // Calculate working minutes and overnight flag
    if (this.startTime && this.endTime) {
        const [sh, sm] = this.startTime.split(':').map(Number);
        const [eh, em] = this.endTime.split(':').map(Number);
        let totalSpan = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
        this.isOvernight = totalSpan < 0;
        if (totalSpan < 0) totalSpan += 24 * 60; // overnight
        this.workingMinutes = Math.max(0, totalSpan - (this.breakMinutes || 0));
    }
});

shiftSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) this.where({ deletedAt: null });
    if (typeof next === 'function') next();
});

const Shift = mongoose.model('Shift', shiftSchema);
export default Shift;