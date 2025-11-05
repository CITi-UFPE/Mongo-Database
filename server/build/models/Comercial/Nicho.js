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
  timestamps: true
});
var _default = exports.default = _mongoose.default.model('Nicho', NichoSchema);
//# sourceMappingURL=Nicho.js.map