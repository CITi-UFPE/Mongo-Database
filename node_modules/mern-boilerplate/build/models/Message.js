"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validateMessage = exports.default = void 0;
var _mongoose = _interopRequireDefault(require("mongoose"));
var _joi = _interopRequireDefault(require("joi"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const {
  Schema
} = _mongoose.default;
const messageSchema = new Schema({
  text: {
    type: String,
    required: true
  },
  user: {
    type: _mongoose.default.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});
messageSchema.methods.toJSON = function () {
  return {
    id: this._id,
    text: this.text,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    user: this.user.toJSON()
  };
};
const validateMessage = message => {
  const schema = {
    text: _joi.default.string().min(5).max(300).required()
  };
  return _joi.default.validate(message, schema);
};
exports.validateMessage = validateMessage;
const Message = _mongoose.default.model('Message', messageSchema);
var _default = exports.default = Message;