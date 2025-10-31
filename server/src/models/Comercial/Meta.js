import mongoose from 'mongoose';
const { Schema } = mongoose;

const MetaSchema = new Schema(
  {
    id_vendedor: {
      type: Schema.Types.ObjectId,
      ref: 'Vendedor',
      required: [true, 'A meta precisa estar associada a um vendedor.'],
    },
    periodo: {
      type: String,
      required: [true, 'O período da meta é obrigatório.'],
      trim: true,
    },
    tipo_meta: {
      type: String,
      required: [true, 'O tipo da meta é obrigatório.'],
      trim: true,
    },
    valor_objetivo: {
      type: Number,
      required: [true, 'O valor objetivo da meta é obrigatório.'],
    },
  },
  {
    timestamps: true,
  },
);

MetaSchema.index({ id_vendedor: 1, periodo: 1 }, { unique: true });

export default mongoose.model('Meta', MetaSchema);