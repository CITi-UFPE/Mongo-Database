import mongoose from 'mongoose';
const { Schema } = mongoose;

const HistoricoFaseLeadSchema = new Schema(
  {

    id_lead: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: [true, 'O registro de histórico deve pertencer a um lead.'],
    },
    id_fase: {
      type: Schema.Types.ObjectId,
      ref: 'FaseFunil',
      required: [true, 'O registro de histórico deve pertencer a uma fase.'],
    },

    data_entrada: {
      type: Date,
      required: [true, 'A data de entrada na fase é obrigatória.'],
    },
    data_saida: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

HistoricoFaseLeadSchema.index({ id_lead: 1 });

export default mongoose.model('HistoricoFaseLead', HistoricoFaseLeadSchema);