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
const MembroSchema = new Schema({
  nome: {
    type: String,
    required: [true, 'O nome do membro é obrigatório.'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'O email do membro é obrigatório.'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, insira um email válido.']
  },
  cargo: {
    type: String,
    required: [true, 'O cargo do membro é obrigatório.'],
    trim: true,
    enum: ['Diretoria', 'Operacional', 'Onda', 'Vendedor']
  },
  telefone: {
    type: String,
    trim: true
  },
  data_entrada: {
    type: Date,
    required: [true, 'A data de entrada é obrigatória.']
  }
}, {
  timestamps: true,
  collection: 'membros_sheet'
});
var _default = exports.default = _mongoose.default.model('Membro', MembroSchema);