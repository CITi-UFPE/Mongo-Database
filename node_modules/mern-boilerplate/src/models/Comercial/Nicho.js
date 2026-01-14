import mongoose from 'mongoose';
const { Schema } = mongoose;

const NichoSchema = new Schema(
  {
    nome_nicho: {
      type: String,
      required: [true, 'O nome do nicho é obrigatório.'],
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    collection: 'nichos',
  },
);

export default mongoose.model('Nicho', NichoSchema);