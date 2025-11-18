"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _authMiddleware = require("../middleware/authMiddleware.js");
const router = (0, _express.Router)();

// Protected route - only authenticated users can access
router.get('/analytics', _authMiddleware.isAuthenticated, (req, res) => {
  res.json({
    message: 'Analytics data',
    user: req.user
  });
});
var _default = exports.default = router;