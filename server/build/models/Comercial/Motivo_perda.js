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
const MotivoPerdaSchema = new Schema({
  descricao: {
    type: String,
    required: [true, 'A descrição do motivo da perda é obrigatória.'],
    trim: true,
    unique: true
  }
}, {
  timestamps: true
});
var _default = exports.default = _mongoose.default.model('MotivoPerda', MotivoPerdaSchema);
//# sourceMappingURL=Motivo_perda.js.map