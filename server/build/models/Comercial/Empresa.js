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
const EmpresaSchema = new Schema({
  nome_empresa: {
    type: String,
    required: [true, 'O nome da empresa é obrigatório.'],
    trim: true
  },
  cnpj: {
    type: String,
    required: [true, 'O CNPJ é obrigatório.'],
    trim: true,
    unique: true
  },
  localizacao_pais: {
    type: String,
    trim: true
  },
  localizacao_estado: {
    type: String,
    trim: true
  },
  faturamento_anual: {
    type: Number
  },
  numero_funcionarios: {
    type: Number
  },
  id_nicho: {
    type: Schema.Types.ObjectId,
    ref: 'Nicho',
    required: [true, 'Toda empresa precisa estar associada a um nicho.']
  }
}, {
  timestamps: true,
  collection: 'empresas_sheet'
});
var _default = exports.default = _mongoose.default.model('Empresa', EmpresaSchema);