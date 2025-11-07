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
const FaseFunilSchema = new Schema({
  nome_fase: {
    type: String,
    required: [true, 'O nome da fase é obrigatório.'],
    trim: true,
    unique: true
  },
  ordem: {
    type: Number,
    required: [true, 'A ordem da fase é obrigatória.'],
    unique: true
  }
}, {
  timestamps: true
});
var _default = exports.default = _mongoose.default.model('FaseFunil', FaseFunilSchema);
//# sourceMappingURL=Fase_funil.js.map