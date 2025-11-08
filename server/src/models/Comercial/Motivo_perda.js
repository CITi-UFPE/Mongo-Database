import mongoose from 'mongoose';
const { Schema } = mongoose;

const MotivoPerdaSchema = new Schema(
  {
    descricao: {
      type: String,
      required: [true, 'A descrição do motivo da perda é obrigatória.'],
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    collection: 'motivos_perda_sheet',
  },
);

export default mongoose.model('MotivoPerda', MotivoPerdaSchema);