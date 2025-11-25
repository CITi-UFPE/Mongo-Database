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
    unique: true // Keep unique to avoid duplicates
  },
  fonte: {
    type: String,
    required: false,
    // Optional since CSV has single origin value
    trim: true
  }
}, {
  timestamps: true,
  collection: 'origens_lead_sheet'
});
var _default = exports.default = _mongoose.default.model('Origem_lead', OrigemLeadSchema);