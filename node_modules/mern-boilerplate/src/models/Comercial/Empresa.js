import mongoose from 'mongoose';
const { Schema } = mongoose;

const EmpresaSchema = new Schema(
  {
    nome_empresa: {
      type: String,
      required: [true, 'O nome da empresa é obrigatório.'],
      trim: true,
    },
    cnpj: {
      type: String,
      required: false, // Optional since CSV data doesn't include CNPJ
      trim: true,
    },
    localizacao_pais: {
      type: String,
      trim: true,
    },
    localizacao_estado: {
      type: String,
      trim: true,
    },
    faturamento_anual: {
      type: Number,
      required: false, // Optional since CSV doesn't include this
    },
    numero_funcionarios: {
      type: Number,
      required: false, // Optional since CSV doesn't include this
    },
    id_nicho: {
      type: Schema.Types.ObjectId,
      ref: 'Nicho',
      required: [true, 'Toda empresa precisa estar associada a um nicho.'],
    },
  },
  {
    timestamps: true,
    collection: 'empresas',
  },
);

export default mongoose.model('Empresa', EmpresaSchema);