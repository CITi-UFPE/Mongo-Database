"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isAuthenticated = void 0;
var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const isAuthenticated = (req, res, next) => {
  var _req$headers$authoriz;
  const token = (_req$headers$authoriz = req.headers.authorization) === null || _req$headers$authoriz === void 0 ? void 0 : _req$headers$authoriz.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      message: 'Unauthorized - No token'
    });
  }
  try {
    const decoded = _jsonwebtoken.default.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      message: 'Unauthorized - Invalid token'
    });
  }
};
exports.isAuthenticated = isAuthenticated;