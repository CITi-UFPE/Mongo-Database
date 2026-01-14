"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _authMiddleware = _interopRequireDefault(require("../middleware/authMiddleware.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const router = (0, _express.Router)();

// Protected route - only authenticated users can access
router.get('/analytics', _authMiddleware.default, (req, res) => {
  res.json({
    message: 'Analytics data',
    user: req.user
  });
});
var _default = exports.default = router;