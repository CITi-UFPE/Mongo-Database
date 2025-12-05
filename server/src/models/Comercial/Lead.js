import mongoose from 'mongoose';
const { Schema } = mongoose;

const LeadSchema = new Schema(
  {

    // Relacionamento com FaseFunil
    id_fase_atual: {
      type: Schema.Types.ObjectId,
      ref: 'FaseFunil',
      required: [true, 'O lead precisa de uma fase inicial no funil.'],
    },
    // Relacionamento com Empresa
    id_empresa: {
      type: Schema.Types.ObjectId,
      ref: 'Empresa',
      required: [true, 'O lead precisa estar ligado a uma empresa.'],
    },
    // Relacionamento com Membro (Quem indicou/prospectou)
    id_membro: {
      type: Schema.Types.ObjectId,
      ref: 'Membro',
      required: [true, 'O lead precisa ter um membro responsável (quem gerou).'],
    },
    // Relacionamento com Contato (A pessoa da empresa)
    id_contato: {
      type: Schema.Types.ObjectId,
      ref: 'Contato',
      required: [true, 'O lead precisa de um contato principal.'],
    },
    // Relacionamento com Origem_lead
    id_origem_lead: {
      type: Schema.Types.ObjectId,
      ref: 'Origem_lead',
      required: [true, 'O lead precisa de uma origem.'],
    },
    // Relacionamento com MotivoPerda
    id_motivo_perda: {
      type: Schema.Types.ObjectId,
      ref: 'MotivoPerda',
      required: false, // Só é preenchido se o status for 'Perdida'
    },
    valor_estimado: {
      type: Number,
      required: [true, 'O valor estimado do lead é obrigatório.'],
      default: 0,
    },
    status: {
      type: String,
      required: true,
 
      enum: ['Aberto', 'Ganho', 'Perdido'],
      default: 'Aberto',
    },
    data_ganho: {
      type: Date,
      required: false,
    },
    data_perda: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'leads',
  },
);

export default mongoose.model('Lead', LeadSchema);

