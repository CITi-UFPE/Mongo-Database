"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _mongoose = _interopRequireDefault(require("mongoose"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const SaleSchema = new _mongoose.default.Schema({
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
  createdAt: Date
});
var _default = exports.default = _mongoose.default.model('Sale', SaleSchema);
//# sourceMappingURL=Sale.js.map