"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _passport = _interopRequireDefault(require("passport"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const requireLocalAuth = _passport.default.authenticate('local', {
  session: false
});
var _default = exports.default = requireLocalAuth;