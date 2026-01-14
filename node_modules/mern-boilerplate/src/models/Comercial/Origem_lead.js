import mongoose from 'mongoose';
const { Schema } = mongoose;

const OrigemLeadSchema = new Schema(
    {
        canal: {
            type: String,
            required: [true, 'O canal de origem é obrigatório.'],
            trim: true,
            unique: true, // Keep unique to avoid duplicates
        },
        fonte: {
            type: String,
            required: false, // Optional since CSV has single origin value
            trim: true,
        },
    },
    {
        timestamps: true,
        collection: 'origem_leads',
    },
);

export default mongoose.model('Origem_lead', OrigemLeadSchema);