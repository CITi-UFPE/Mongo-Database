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
const MetaSchema = new Schema({
  id_vendedor: {
    type: Schema.Types.ObjectId,
    ref: 'Vendedor',
    required: [true, 'A meta precisa estar associada a um vendedor.']
  },
  periodo: {
    type: String,
    required: [true, 'O período da meta é obrigatório.'],
    trim: true
  },
  tipo_meta: {
    type: String,
    required: [true, 'O tipo da meta é obrigatório.'],
    trim: true
  },
  valor_objetivo: {
    type: Number,
    required: [true, 'O valor objetivo da meta é obrigatório.']
  }
}, {
  timestamps: true
});
MetaSchema.index({
  id_vendedor: 1,
  periodo: 1
}, {
  unique: true
});
var _default = exports.default = _mongoose.default.model('Meta', MetaSchema);