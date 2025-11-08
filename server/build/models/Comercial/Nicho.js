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
const NichoSchema = new Schema({
  nome_nicho: {
    type: String,
    required: [true, 'O nome do nicho é obrigatório.'],
    trim: true,
    unique: true
  }
}, {
  timestamps: true,
  collection: 'nichos_sheet'
});
var _default = exports.default = _mongoose.default.model('Nicho', NichoSchema);