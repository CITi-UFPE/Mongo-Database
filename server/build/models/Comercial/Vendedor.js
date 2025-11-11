"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _mongoose = _interopRequireDefault(require("mongoose"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const {
  Schema
} = _mongoose.default;
const VendedorSchema = new Schema({
  id_membro: {
    type: Schema.Types.ObjectId,
    ref: 'Membro',
    required: true,
    unique: true
  }
}, {
  timestamps: true
});
var _default = exports.default = _mongoose.default.model('Vendedor', VendedorSchema);