"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _passport = _interopRequireDefault(require("passport"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const requireJwtAuth = _passport.default.authenticate('jwt', {
  session: false
});
var _default = exports.default = requireJwtAuth;
//# sourceMappingURL=requireJwtAuth.js.map