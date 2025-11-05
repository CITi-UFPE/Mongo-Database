import mongoose from 'mongoose';

const SaleSchema = new mongoose.Schema({
  brand: String,
  model: String,
  year: Number,
  color: String,
  price: Number,
  condition: String,
  fuelType: String,
  transmission: String,
  mileage: Number,
  buyerName: String,
  buyerEmail: String,
  sellerName: String,
  paymentMethod: String,
  saleDate: Date,
  city: String,
  state: String,
  createdAt: Date,
});

export default mongoose.model('Sale', SaleSchema);
