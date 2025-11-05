import mongoose from 'mongoose';
const { Schema } = mongoose;

const OrigemLeadSchema = new Schema(
    {
        canal: {
            type: String,
            required: [true, 'O canal de origem é obrigatório.'],
            trim: true,
            unique: true,
        },
        fonte: {
            type: String,
            required: [true, 'A fonte é obrigatória.'],
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model('Origem_lead', OrigemLeadSchema);