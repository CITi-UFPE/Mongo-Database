"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerSchema = exports.loginSchema = void 0;
var _joi = _interopRequireDefault(require("joi"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const loginSchema = exports.loginSchema = _joi.default.object().keys({
  email: _joi.default.string().trim().email().required(),
  password: _joi.default.string().trim().min(6).max(20).required()
});
const registerSchema = exports.registerSchema = _joi.default.object().keys({
  name: _joi.default.string().trim().min(2).max(30).required(),
  username: _joi.default.string().trim().min(2).max(20).regex(/^[a-zA-Z0-9_]+$/).required(),
  email: _joi.default.string().trim().email().required(),
  password: _joi.default.string().trim().min(6).max(20).required()
});
//# sourceMappingURL=validators.js.map