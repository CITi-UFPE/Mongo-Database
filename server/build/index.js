"use strict";

require("dotenv/config");
var _express = _interopRequireDefault(require("express"));
var _mongoose = _interopRequireDefault(require("mongoose"));
var _cors = _interopRequireDefault(require("cors"));
var _path = require("path");
var _passport = _interopRequireDefault(require("passport"));
var _routes = _interopRequireDefault(require("./routes"));
var _seed = require("./utils/seed");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const app = (0, _express.default)();

// CORS - Allow requests from client URLs
const clientUrlDev = process.env.CLIENT_URL_DEV || 'http://localhost:3000';
const clientUrlProd = process.env.CLIENT_URL_PROD || 'http://localhost:3080';
const allowedOrigins = ['http://localhost:5173',
// Vite dev server
'http://localhost:4173',
// Vite preview
'http://localhost:3000',
// React dev
'http://localhost:3080',
// Docker production
clientUrlDev, clientUrlProd, 'https://mern-boilerplate.amd2.localhost3002.live', 'https://localhost3002.live'];
app.use((0, _cors.default)({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// COOP
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});
app.use(_express.default.json());
app.use(_express.default.urlencoded({
  extended: true
}));
app.use(_passport.default.initialize());

// Load passport strategies
require('./services/jwtStrategy');
require('./services/googleStrategy');
require('./services/localStrategy');
const isProduction = process.env.NODE_ENV === 'production';
const dbConnection = isProduction ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_DEV;
_mongoose.default.connect(dbConnection).then(() => {
  console.log('MongoDB Connected...');
  (0, _seed.seedDb)();
}).catch(err => console.log(err));
app.use('/', _routes.default);
app.use('/public/images', _express.default.static((0, _path.join)(__dirname, '../public/images')));
app.get('/', (req, res) => {
  res.json({
    message: 'Server is running'
  });
});
const port = process.env.PORT || 5000;
const host = isProduction ? '0.0.0.0' : 'localhost';
app.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});