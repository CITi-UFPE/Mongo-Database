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
const ContatoSchema = new Schema({
  id_empresa: {
    type: Schema.Types.ObjectId,
    ref: 'Empresa',
    required: [true, 'O contato precisa estar associado a uma empresa.']
  },
  nome: {
    type: String,
    required: [true, 'O nome do contato é obrigatório.'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'O email do contato é obrigatório.'],
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, insira um email válido.']
  },
  telefone: {
    type: String,
    trim: true
  },
  cargo: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});
ContatoSchema.index({
  id_empresa: 1,
  email: 1
}, {
  unique: true
});
var _default = exports.default = _mongoose.default.model('Contato', ContatoSchema);
//# sourceMappingURL=Contato.js.map