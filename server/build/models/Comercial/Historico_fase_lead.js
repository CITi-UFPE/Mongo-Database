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
const HistoricoFaseLeadSchema = new Schema({
  id_lead: {
    type: Schema.Types.ObjectId,
    ref: 'Lead',
    required: [true, 'O registro de histórico deve pertencer a um lead.']
  },
  id_fase: {
    type: Schema.Types.ObjectId,
    ref: 'FaseFunil',
    required: [true, 'O registro de histórico deve pertencer a uma fase.']
  },
  data_entrada: {
    type: Date,
    required: [true, 'A data de entrada na fase é obrigatória.']
  },
  data_saida: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});
HistoricoFaseLeadSchema.index({
  id_lead: 1
});
var _default = exports.default = _mongoose.default.model('HistoricoFaseLead', HistoricoFaseLeadSchema);