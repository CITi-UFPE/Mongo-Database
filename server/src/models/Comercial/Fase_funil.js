import mongoose from 'mongoose';
const { Schema } = mongoose;

const FaseFunilSchema = new Schema(
  {
    nome_fase: {
      type: String,
      required: [true, 'O nome da fase é obrigatório.'],
      trim: true,
      unique: true,
    },
    ordem: {
      type: Number,
      required: [true, 'A ordem da fase é obrigatória.'],
      unique: true,
    },
  },
  {
    timestamps: true,
    collection: 'fases_funil_sheet',
  },
);

export default mongoose.model('FaseFunil', FaseFunilSchema);