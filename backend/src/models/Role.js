import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        label: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        color: {
            type: String,
            default: '#4b5563',
        },
        permissions: {
            type: [String],
            default: [],
        },
        isSystem: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

roleSchema.index({ name: 1 });

const Role = mongoose.model('Role', roleSchema);
export default Role;
