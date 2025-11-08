import mongoose from 'mongoose';
const { Schema } = mongoose;

const VendedorSchema = new Schema(
  {
    id_membro: {
      type: Schema.Types.ObjectId,
      ref: 'Membro', 
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    collection: 'vendedores_sheet',
  },
);

export default mongoose.model('Vendedor', VendedorSchema);