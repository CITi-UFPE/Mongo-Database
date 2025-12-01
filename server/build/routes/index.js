"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = require("express");
var _localAuth = _interopRequireDefault(require("./localAuth"));
var _googleAuth = _interopRequireDefault(require("./googleAuth"));
var _facebookAuth = _interopRequireDefault(require("./facebookAuth"));
var _api = _interopRequireDefault(require("./api"));
var _analyticsAuth = _interopRequireDefault(require("./analyticsAuth.js"));
var _gemini = _interopRequireDefault(require("./gemini.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const router = (0, _express.Router)();

// rota raiz
router.get('/', (req, res) => {
  res.json({
    message: 'Server is running',
    version: '1.0.0'
  });
});
router.use('/auth', _localAuth.default);
router.use('/auth', _googleAuth.default);
router.use('/auth', _facebookAuth.default);
router.use('/api', _api.default);
router.use('/api', _analyticsAuth.default);
router.use('/api/gemini', _gemini.default);
// fallback 404
router.use('/api', (req, res) => res.status(404).json('No route for this path'));
var _default = exports.default = router;
/*
routes:

GET /auth/google
GET /auth/google/callback

GET /auth/facebook
GET /auth/facebook/callback

POST /auth/login
POST /auth/register
GET /auth/logout

GET api/users/me
GET /api/users/feature

*/