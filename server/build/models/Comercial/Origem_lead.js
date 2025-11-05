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
const OrigemLeadSchema = new Schema({
  canal: {
    type: String,
    required: [true, 'O canal de origem é obrigatório.'],
    trim: true,
    unique: true
  },
  fonte: {
    type: String,
    required: [true, 'A fonte é obrigatória.'],
    trim: true
  }
}, {
  timestamps: true
});
var _default = exports.default = _mongoose.default.model('Origem_lead', OrigemLeadSchema);
//# sourceMappingURL=Origem_lead.js.map