import mongoose from 'mongoose';
const { Schema } = mongoose;

const ContatoSchema = new Schema(
  {
    id_empresa: {
      type: Schema.Types.ObjectId,
      ref: 'Empresa',
      required: [true, 'O contato precisa estar associado a uma empresa.'],
    },
    nome: {
      type: String,
      required: [true, 'O nome do contato é obrigatório.'],
      trim: true,
    },
    email: {
      type: String,
      required: false, // Optional since CSV only has contact names
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Por favor, insira um email válido.',
      ],
    },
    telefone: {
      type: String,
      required: false, // Optional
      trim: true,
    },
    cargo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'contatos_sheet',
  },
);

// Removed unique index on email since we'll generate placeholder emails
// ContatoSchema.index({ id_empresa: 1, email: 1 }, { unique: true });

export default mongoose.model('Contato', ContatoSchema);