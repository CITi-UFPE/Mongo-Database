"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _users = _interopRequireDefault(require("./users"));
var _messages = _interopRequireDefault(require("./messages"));
var _spreadsheet = _interopRequireDefault(require("./spreadsheet"));
var _analytics = _interopRequireDefault(require("./analytics"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const router = (0, _express.Router)();
router.use('/users', _users.default);
router.use('/messages', _messages.default);
router.use('/spreadsheet', _spreadsheet.default);
router.use('/analytics', _analytics.default);
var _default = exports.default = router;