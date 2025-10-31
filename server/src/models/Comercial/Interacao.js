import mongoose from 'mongoose';
const { Schema } = mongoose;

const InteracaoSchema = new Schema(
  {

    id_lead: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'A interação deve estar ligada a um lead.'],
    },
    id_contato: {
      type: Schema.Types.ObjectId,
      ref: 'Contato',
      required: [true, 'A interação deve estar ligada a um contato.'],
    },
    id_vendedor: {
      type: Schema.Types.ObjectId,
      ref: 'Vendedor',
      required: [true, 'A interação deve ter um vendedor responsável.'],
    },
    tipo_atividade: {
      type: String,
      required: [true, 'O tipo da atividade é obrigatório.'],
      trim: true,
    },
    data_realizacao: {
      type: Date,
      required: [true, 'A data de realização é obrigatória.'],
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

InteracaoSchema.index({ id_lead: 1 });

export default mongoose.model('Interacao', InteracaoSchema);